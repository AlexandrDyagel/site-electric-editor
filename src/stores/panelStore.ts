import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  CalculationResult,
  CircuitConfig,
  ComponentDef,
  DinRail,
  LayoutComponent,
  LoadConsumer,
  PanelLayout,
  PanelProject,
  PlacedComponent,
  Wire,
} from '@/types'
import { createDemoProject, createEmptyProject } from '@/data/demo'
import { getComponentDef } from '@/data/library'
import { buildLayout, findRailForNewComponent, placeComponentOnRail, reorderOnRail } from '@/services/layoutEngine'
import { calculatePanel } from '@/services/calcEngine'
import { inferWireDraft, validateConnection } from '@/services/validationEngine'
import { parseProjectJson, serializeProject } from '@/services/projectSerialization'
import { cloneDeep, createUid } from '@/utils/id'
import { MAX_RAILS } from '@/config/editor'

const DRAFT_KEY = 'voltlab.draft.v1'
const HISTORY_LIMIT = 40

export type EditorViewMode = 'bezier' | 'orthogonal'
export type EditorTab = 'calc' | 'inspector'

export interface ActionResult {
  ok: boolean
  message: string
}

export interface NewConsumerInput {
  name: string
  powerW: number
  cosPhi: number
  utilization: number
  phase: 1 | 3
  phaseLine: LoadConsumer['phaseLine']
  loadType: LoadConsumer['loadType']
  componentUid: string
}

function loadDraft(): PanelProject | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const result = parseProjectJson(JSON.parse(raw))
    return result.ok ? result.project : null
  } catch {
    return null
  }
}

export const usePanelStore = defineStore('panel', () => {
  const project = ref<PanelProject>(createDemoProject())
  const selectedComponentUid = ref<string | null>(null)
  const selectedWireUid = ref<string | null>(null)
  const viewMode = ref<EditorViewMode>('bezier')
  const activeTab = ref<EditorTab>('calc')
  const history = ref<PanelProject[]>([])
  const future = ref<PanelProject[]>([])
  const initialized = ref(false)

  const layout = computed<PanelLayout>(() => buildLayout(project.value))
  const calculation = computed<CalculationResult>(() => calculatePanel(project.value, layout.value))
  const selectedComponent = computed<LayoutComponent | null>(
    () => layout.value.components.find((item) => item.placed.uid === selectedComponentUid.value) ?? null,
  )
  const selectedWire = computed<Wire | null>(
    () => project.value.wires.find((item) => item.uid === selectedWireUid.value) ?? null,
  )
  const selectedDef = computed<ComponentDef | null>(() => selectedComponent.value?.def ?? null)
  const componentCount = computed(() => project.value.components.length)
  const wireCount = computed(() => project.value.wires.length)
  const totalPrice = computed(() =>
    project.value.components.reduce(
      (sum, component) => sum + (getComponentDef(component.defId)?.price ?? 0),
      0,
    ),
  )
  const specification = computed(() => {
    const map = new Map<string, { def: ComponentDef; quantity: number; amount: number }>()
    for (const placed of project.value.components) {
      const def = getComponentDef(placed.defId)
      if (!def) continue
      const current = map.get(def.id)
      if (current) {
        current.quantity += 1
        current.amount += def.price
      } else {
        map.set(def.id, { def, quantity: 1, amount: def.price })
      }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  })
  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function persistDraft(): void {
    try {
      localStorage.setItem(DRAFT_KEY, serializeProject(project.value))
    } catch {
      // Черновик — необязательное сохранение; не мешаем работе редактора.
    }
  }

  function snapshot(): void {
    history.value.push(cloneDeep(project.value))
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    future.value = []
  }

  function touch(): void {
    project.value.updatedAt = new Date().toISOString()
    persistDraft()
  }

  function initialize(forceDraft = false): void {
    if (initialized.value && !forceDraft) return
    const draft = loadDraft()
    if (draft) project.value = draft
    initialized.value = true
  }

  function loadProject(next: PanelProject): void {
    project.value = cloneDeep(next)
    selectedComponentUid.value = null
    selectedWireUid.value = null
    history.value = []
    future.value = []
    activeTab.value = 'calc'
    initialized.value = true
    persistDraft()
  }

  function newProject(name = 'Новый проект щита'): PanelProject {
    const next = createEmptyProject(name)
    loadProject(next)
    return next
  }

  function loadDemo(): PanelProject {
    const next = createDemoProject('Квартирный щит · демо')
    loadProject(next)
    return next
  }

  function importProject(raw: unknown): ActionResult {
    const parsed = parseProjectJson(raw)
    if (!parsed.ok) return { ok: false, message: parsed.error }
    loadProject(parsed.project)
    return { ok: true, message: `Проект «${parsed.project.name}» загружен` }
  }

  function updateProjectMeta(patch: Partial<Pick<PanelProject, 'name' | 'description'>>): void {
    snapshot()
    if (patch.name !== undefined) project.value.name = patch.name.trim() || 'Без названия'
    if (patch.description !== undefined) project.value.description = patch.description
    touch()
  }

  function updateSupply(patch: Partial<PanelProject['supply']>): void {
    snapshot()
    project.value.supply = { ...project.value.supply, ...patch }
    // При смене количества фаз автоматически приводим напряжение к типовому.
    if (patch.phase === 1 && project.value.supply.voltage > 300) {
      project.value.supply.voltage = 230
    }
    if (patch.phase === 3 && project.value.supply.voltage < 300) {
      project.value.supply.voltage = 400
    }
    touch()
  }

  function addComponent(defId: string, target?: { railId: string; module: number }): ActionResult {
    const def = getComponentDef(defId)
    if (!def) return { ok: false, message: 'Оборудование не найдено в библиотеке' }
    snapshot()
    const placed: PlacedComponent = {
      uid: createUid('c'),
      defId,
      dinRailId: target?.railId ?? project.value.rails[0]?.id ?? '',
      position: target?.module ?? 0,
    }
    const result = target
      ? placeComponentOnRail(project.value, placed, target.railId, target.module)
      : (() => {
          const spot = findRailForNewComponent(project.value, def.sizeModules)
          if (!spot) return { components: project.value.components, ok: false, reason: 'Все рейки заполнены' }
          return placeComponentOnRail(project.value, placed, spot.railId, spot.position)
        })()
    if (!result.ok) {
      history.value.pop()
      return { ok: false, message: result.reason ?? 'Не удалось добавить компонент' }
    }
    project.value.components = result.components
    selectedComponentUid.value = placed.uid
    selectedWireUid.value = null
    activeTab.value = 'inspector'
    touch()
    return { ok: true, message: `${def.name} добавлен на рейку` }
  }

  function moveComponent(uid: string, railId: string, module: number): ActionResult {
    snapshot()
    const result = reorderOnRail(project.value, uid, railId, module)
    if (!result.ok) {
      history.value.pop()
      return { ok: false, message: result.reason ?? 'Не удалось переместить компонент' }
    }
    project.value.components = result.components
    touch()
    return { ok: true, message: 'Компонент перемещён' }
  }

  function removeComponent(uid: string): ActionResult {
    const component = layout.value.components.find((item) => item.placed.uid === uid)
    if (!component) return { ok: false, message: 'Компонент не найден' }
    const prefix = `${uid}:`
    const removedWireIds = new Set(
      project.value.wires
        .filter((wire) => wire.from.startsWith(prefix) || wire.to.startsWith(prefix))
        .map((wire) => wire.uid),
    )
    snapshot()
    project.value.components = project.value.components.filter((item) => item.uid !== uid)
    project.value.wires = project.value.wires.filter((wire) => !removedWireIds.has(wire.uid))
    project.value.consumers = project.value.consumers.filter(
      (consumer) =>
        !consumer.wireUidOrTerminalUid.startsWith(prefix) &&
        !removedWireIds.has(consumer.wireUidOrTerminalUid),
    )
    project.value.circuits = project.value.circuits.filter((circuit) => circuit.componentUid !== uid)
    if (selectedComponentUid.value === uid) selectedComponentUid.value = null
    if (selectedWireUid.value && removedWireIds.has(selectedWireUid.value)) selectedWireUid.value = null
    touch()
    return { ok: true, message: `«${component.placed.customName ?? component.def.name}» удалён` }
  }

  function duplicateComponent(uid: string): ActionResult {
    const component = layout.value.components.find((item) => item.placed.uid === uid)
    if (!component) return { ok: false, message: 'Компонент не найден' }
    snapshot()
    const placed: PlacedComponent = {
      uid: createUid('c'),
      defId: component.def.id,
      dinRailId: component.rail.id,
      position: component.moduleEnd,
      ...(component.placed.customName ? { customName: `${component.placed.customName} — копия` } : {}),
    }
    let result = placeComponentOnRail(
      project.value,
      placed,
      component.rail.id,
      component.moduleEnd,
    )
    if (!result.ok) {
      const spot = findRailForNewComponent(project.value, component.def.sizeModules)
      if (spot) {
        placed.dinRailId = spot.railId
        result = placeComponentOnRail(project.value, placed, spot.railId, spot.position)
      }
    }
    if (!result.ok) {
      history.value.pop()
      return { ok: false, message: 'Нет свободного места для копии' }
    }
    project.value.components = result.components
    selectedComponentUid.value = placed.uid
    activeTab.value = 'inspector'
    touch()
    return { ok: true, message: 'Создана копия компонента' }
  }

  function renameComponent(uid: string, name: string): void {
    const component = project.value.components.find((item) => item.uid === uid)
    if (!component) return
    snapshot()
    const trimmed = name.trim()
    if (trimmed) component.customName = trimmed
    else delete component.customName
    touch()
  }

  function addWire(from: string, to: string, overrides?: Partial<Pick<Wire, 'kind' | 'phase' | 'crossSection' | 'color'>>): ActionResult {
    const validation = validateConnection(project.value, layout.value, from, to)
    if (!validation.valid) return { ok: false, message: validation.message ?? 'Соединение запрещено' }
    const fromTerminal = layout.value.terminals.get(from)
    const toTerminal = layout.value.terminals.get(to)
    if (!fromTerminal || !toTerminal) return { ok: false, message: 'Клемма не найдена' }
    const draft = inferWireDraft(fromTerminal, toTerminal)
    snapshot()
    const wire: Wire = {
      uid: createUid('wire'),
      from,
      to,
      kind: overrides?.kind ?? draft.kind,
      ...(overrides?.phase ?? draft.phase ? { phase: overrides?.phase ?? draft.phase } : {}),
      crossSection: overrides?.crossSection ?? draft.crossSection,
      ...(overrides?.color ? { color: overrides.color } : {}),
    }
    project.value.wires.push(wire)
    selectedWireUid.value = wire.uid
    selectedComponentUid.value = null
    activeTab.value = 'inspector'
    touch()
    return { ok: true, message: 'Провод проложен' }
  }

  function updateWire(
    uid: string,
    patch: Partial<Pick<Wire, 'kind' | 'phase' | 'crossSection' | 'color'>>,
  ): void {
    const wire = project.value.wires.find((item) => item.uid === uid)
    if (!wire) return
    snapshot()
    Object.assign(wire, patch)
    if (wire.kind !== 'phase') delete wire.phase
    touch()
  }

  function removeWire(uid: string): ActionResult {
    const exists = project.value.wires.some((wire) => wire.uid === uid)
    if (!exists) return { ok: false, message: 'Провод не найден' }
    snapshot()
    project.value.wires = project.value.wires.filter((wire) => wire.uid !== uid)
    project.value.consumers = project.value.consumers.filter(
      (consumer) => consumer.wireUidOrTerminalUid !== uid,
    )
    if (selectedWireUid.value === uid) selectedWireUid.value = null
    touch()
    return { ok: true, message: 'Провод удалён' }
  }

  function addRail(): ActionResult {
    if (project.value.rails.length >= MAX_RAILS) {
      return { ok: false, message: `Максимум ${MAX_RAILS} реек на щит` }
    }
    snapshot()
    const index = project.value.rails.length + 1
    const rail: DinRail = {
      id: createUid('rail'),
      name: `Ряд ${index}`,
      capacity: 16,
    }
    project.value.rails.push(rail)
    touch()
    return { ok: true, message: `Добавлена рейка «${rail.name}»` }
  }

  function removeRail(railId: string): ActionResult {
    const rail = project.value.rails.find((item) => item.id === railId)
    if (!rail) return { ok: false, message: 'Рейка не найдена' }
    if (project.value.rails.length <= 1) return { ok: false, message: 'Нельзя удалить последнюю рейку' }
    if (project.value.components.some((item) => item.dinRailId === railId)) {
      return { ok: false, message: 'Сначала освободите рейку от оборудования' }
    }
    snapshot()
    project.value.rails = project.value.rails.filter((item) => item.id !== railId)
    touch()
    return { ok: true, message: `Рейка «${rail.name}» удалена` }
  }

  function renameRail(railId: string, name: string): void {
    const rail = project.value.rails.find((item) => item.id === railId)
    if (!rail) return
    snapshot()
    rail.name = name.trim() || rail.name
    touch()
  }

  function addConsumer(input: NewConsumerInput): ActionResult {
    const line = layout.value.components.find((item) => item.placed.uid === input.componentUid)
    if (!line) return { ok: false, message: 'Выберите защитную линию' }
    const target = line.terminals.find((terminal) => terminal.side === 'out' && terminal.kind === 'L1')
    if (!target) return { ok: false, message: 'У линии нет выходной клеммы' }
    snapshot()
    const consumer: LoadConsumer = {
      uid: createUid('load'),
      name: input.name.trim() || 'Потребитель',
      wireUidOrTerminalUid: target.uid,
      powerW: Math.max(0, input.powerW),
      cosPhi: Math.min(1, Math.max(0.1, input.cosPhi)),
      utilization: Math.min(1, Math.max(0, input.utilization)),
      phase: input.phase,
      phaseLine: input.phaseLine,
      loadType: input.loadType,
    }
    project.value.consumers.push(consumer)
    if (!project.value.circuits.some((item) => item.componentUid === input.componentUid)) {
      const circuit: CircuitConfig = {
        componentUid: input.componentUid,
        cableSection: line.def.ratedCurrent && line.def.ratedCurrent <= 16 ? 2.5 : 4,
        material: 'copper',
        insulation: 'pvc',
        laying: 'conduit',
        lengthM: 15,
        groupCount: 1,
        ambientC: 25,
      }
      project.value.circuits.push(circuit)
    }
    touch()
    return { ok: true, message: `Потребитель «${consumer.name}» добавлен` }
  }

  function updateConsumer(uid: string, patch: Partial<Omit<LoadConsumer, 'uid'>>): void {
    const consumer = project.value.consumers.find((item) => item.uid === uid)
    if (!consumer) return
    snapshot()
    Object.assign(consumer, patch)
    touch()
  }

  function removeConsumer(uid: string): ActionResult {
    const consumer = project.value.consumers.find((item) => item.uid === uid)
    if (!consumer) return { ok: false, message: 'Потребитель не найден' }
    snapshot()
    project.value.consumers = project.value.consumers.filter((item) => item.uid !== uid)
    touch()
    return { ok: true, message: `Потребитель «${consumer.name}» удалён` }
  }

  function updateCircuit(componentUid: string, patch: Partial<Omit<CircuitConfig, 'componentUid'>>): void {
    snapshot()
    const circuit = project.value.circuits.find((item) => item.componentUid === componentUid)
    if (!circuit) {
      const line = layout.value.components.find((item) => item.placed.uid === componentUid)
      if (!line) {
        history.value.pop()
        return
      }
      project.value.circuits.push({
        componentUid,
        cableSection: 2.5,
        material: 'copper',
        insulation: 'pvc',
        laying: 'conduit',
        lengthM: 15,
        groupCount: 1,
        ambientC: 25,
        ...patch,
      })
    } else {
      Object.assign(circuit, patch)
    }
    touch()
  }

  function selectComponent(uid: string | null): void {
    selectedComponentUid.value = uid
    selectedWireUid.value = null
    if (uid) activeTab.value = 'inspector'
  }

  function selectWire(uid: string | null): void {
    selectedWireUid.value = uid
    selectedComponentUid.value = null
    if (uid) activeTab.value = 'inspector'
  }

  function clearSelection(): void {
    selectedComponentUid.value = null
    selectedWireUid.value = null
  }

  function setViewMode(mode: EditorViewMode): void {
    viewMode.value = mode
  }

  function undo(): void {
    const previous = history.value.pop()
    if (!previous) return
    future.value.push(cloneDeep(project.value))
    project.value = previous
    selectedComponentUid.value = null
    selectedWireUid.value = null
    persistDraft()
  }

  function redo(): void {
    const next = future.value.pop()
    if (!next) return
    history.value.push(cloneDeep(project.value))
    project.value = next
    selectedComponentUid.value = null
    selectedWireUid.value = null
    persistDraft()
  }

  function markSaved(): void {
    project.value.updatedAt = new Date().toISOString()
    persistDraft()
  }

  function cloneCurrent(): PanelProject {
    return cloneDeep(project.value)
  }

  return {
    project,
    layout,
    calculation,
    selectedComponentUid,
    selectedWireUid,
    selectedComponent,
    selectedDef,
    selectedWire,
    viewMode,
    activeTab,
    componentCount,
    wireCount,
    totalPrice,
    specification,
    canUndo,
    canRedo,
    history,
    future,
    initialized,
    initialize,
    loadProject,
    newProject,
    loadDemo,
    importProject,
    updateProjectMeta,
    updateSupply,
    addComponent,
    moveComponent,
    removeComponent,
    duplicateComponent,
    renameComponent,
    addWire,
    updateWire,
    removeWire,
    addRail,
    removeRail,
    renameRail,
    addConsumer,
    updateConsumer,
    removeConsumer,
    updateCircuit,
    selectComponent,
    selectWire,
    clearSelection,
    setViewMode,
    undo,
    redo,
    markSaved,
    cloneCurrent,
    persistDraft,
  }
})
