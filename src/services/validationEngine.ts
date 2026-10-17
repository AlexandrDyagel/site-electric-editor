import type {
  CalculationIssue,
  ComponentDef,
  ConnectionValidation,
  LayoutComponent,
  PanelLayout,
  PanelProject,
  PhaseTag,
  Terminal,
  Wire,
  WireDraft,
  WireKind,
} from '@/types'
import { getComponentDef } from '@/data/library'

export interface WiringGraph {
  terminals: Map<string, Terminal>
  componentTerminals: Map<string, Terminal[]>
  wiresByTerminal: Map<string, Wire[]>
  wiresById: Map<string, Wire>
}

export function buildWiringGraph(project: PanelProject, layout: PanelLayout): WiringGraph {
  const wiresByTerminal = new Map<string, Wire[]>()
  const wiresById = new Map<string, Wire>()
  for (const wire of project.wires) {
    wiresById.set(wire.uid, wire)
    const fromList = wiresByTerminal.get(wire.from) ?? []
    fromList.push(wire)
    wiresByTerminal.set(wire.from, fromList)
    const toList = wiresByTerminal.get(wire.to) ?? []
    toList.push(wire)
    wiresByTerminal.set(wire.to, toList)
  }
  const terminals = new Map<string, Terminal>(layout.terminals)
  const componentTerminals = new Map<string, Terminal[]>()
  for (const terminal of terminals.values()) {
    const list = componentTerminals.get(terminal.componentUid) ?? []
    list.push(terminal)
    componentTerminals.set(terminal.componentUid, list)
  }
  return { terminals, componentTerminals, wiresByTerminal, wiresById }
}

/**
 * Поиск всех аппаратов выше по цепи.
 * Идём от входных клемм компонента против потока: провод → выход upstream-аппарата →
 * его вход (внутренняя проводимость). Шины связывают вход и выходы внутри корпуса.
 */
export function findUpstreamComponents(
  project: PanelProject,
  layout: PanelLayout,
  componentUid: string,
): Set<string> {
  return new Set(findUpstreamDistances(project, layout, componentUid).keys())
}

/**
 * То же обход, но с расстоянием до аппарата. Ближайшая защита — это минимальное
 * расстояние, а не минимальный номинал: именно она стоит непосредственно выше
 * по цепи и должна участвовать в проверке селективности.
 */
export function findUpstreamDistances(
  project: PanelProject,
  layout: PanelLayout,
  componentUid: string,
): Map<string, number> {
  const graph = buildWiringGraph(project, layout)
  const startTerminals = (graph.componentTerminals.get(componentUid) ?? []).filter(
    (terminal) => terminal.side === 'in',
  )
  const queue: Array<{ terminalUid: string; depth: number }> = startTerminals.map((terminal) => ({
    terminalUid: terminal.uid,
    depth: 0,
  }))
  const visitedTerminals = new Map<string, number>()
  const distances = new Map<string, number>()
  while (queue.length > 0) {
    const entry = queue.shift()
    if (!entry) continue
    const previousDepth = visitedTerminals.get(entry.terminalUid)
    if (previousDepth !== undefined && previousDepth <= entry.depth) continue
    visitedTerminals.set(entry.terminalUid, entry.depth)
    const terminal = graph.terminals.get(entry.terminalUid)
    if (!terminal) continue
    if (terminal.side === 'out' && terminal.componentUid !== componentUid) {
      const known = distances.get(terminal.componentUid)
      if (known === undefined || entry.depth < known) {
        distances.set(terminal.componentUid, entry.depth)
      }
    }
    /*
     * Провод от выходной клеммы ведёт вниз по цепи к потребителям. Чтобы не
     * «захватить» соседние отходящие линии, двигаемся от выхода только внутрь
     * аппарата (out → in). Провода обходим лишь на входных клеммах.
     */
    if (terminal.side === 'out') {
      const internals = (graph.componentTerminals.get(terminal.componentUid) ?? []).filter(
        (item) => item.side === 'in' && item.kind === terminal.kind,
      )
      for (const internal of internals) {
        const known = visitedTerminals.get(internal.uid)
        if (known === undefined || known > entry.depth) {
          queue.push({ terminalUid: internal.uid, depth: entry.depth })
        }
      }
      continue
    }
    const connectedWires = graph.wiresByTerminal.get(entry.terminalUid) ?? []
    for (const wire of connectedWires) {
      const nextUid = wire.from === entry.terminalUid ? wire.to : wire.from
      const nextTerminal = graph.terminals.get(nextUid)
      if (!nextTerminal) continue
      if (nextTerminal.componentUid === componentUid) continue
      // Другой вход — это ответвление вниз, а не питающая цепь.
      if (nextTerminal.side !== 'out') continue
      const nextDepth = entry.depth + 1
      const known = visitedTerminals.get(nextUid)
      if (known === undefined || known > nextDepth) {
        queue.push({ terminalUid: nextUid, depth: nextDepth })
      }
    }
  }
  return distances
}

export function upstreamDefs(
  project: PanelProject,
  layout: PanelLayout,
  componentUid: string,
): Array<{ component: LayoutComponent; def: ComponentDef }> {
  const ids = findUpstreamComponents(project, layout, componentUid)
  return layout.components
    .filter((component) => ids.has(component.placed.uid))
    .map((component) => ({ component, def: component.def }))
}

export function isRcd(def: ComponentDef): boolean {
  return def.category === 'rcd' || def.category === 'rcbo'
}

export function terminalPhase(terminal: Terminal): PhaseTag | undefined {
  return terminal.kind === 'L1' || terminal.kind === 'L2' || terminal.kind === 'L3'
    ? terminal.kind
    : undefined
}

function defaultCrossSection(from: Terminal, to: Terminal): number {
  const def = getComponentDef(from.defId) ?? getComponentDef(to.defId)
  const current = def?.ratedCurrent ?? 16
  if (current <= 16) return 2.5
  if (current <= 25) return 4
  if (current <= 40) return 6
  if (current <= 63) return 10
  return 16
}

export function inferWireDraft(from: Terminal, to: Terminal): WireDraft {
  const phase = terminalPhase(from) ?? terminalPhase(to)
  let kind: WireKind = 'phase'
  if (from.kind === 'PE' && to.kind === 'PE') kind = 'ground'
  else if (from.kind === 'N' && to.kind === 'N') kind = 'neutral'
  else if (from.kind === 'PE' || to.kind === 'PE') kind = 'jumper'
  return {
    from: from.uid,
    to: to.uid,
    kind,
    phase,
    crossSection: defaultCrossSection(from, to),
  }
}

function isPhase(kind: Terminal['kind']): boolean {
  return kind === 'L1' || kind === 'L2' || kind === 'L3'
}

/**
 * Проверка пары клемм до создания провода.
 * Запрещаем прямые КЗ и объединение N/PE после УЗО.
 */
export function validateConnection(
  project: PanelProject,
  layout: PanelLayout,
  fromUid: string,
  toUid: string,
): ConnectionValidation {
  if (fromUid === toUid) {
    return { valid: false, code: 'SAME_TERMINAL', message: 'Нельзя соединить клемму саму с собой' }
  }
  const graph = buildWiringGraph(project, layout)
  const from = graph.terminals.get(fromUid)
  const to = graph.terminals.get(toUid)
  if (!from || !to) {
    return { valid: false, code: 'NO_TERMINAL', message: 'Клемма не найдена на схеме' }
  }
  if (from.componentUid === to.componentUid) {
    return {
      valid: false,
      code: 'SAME_COMPONENT',
      message: 'Клеммы одного аппарата соединять перемычкой не требуется',
    }
  }
  const duplicate = project.wires.some(
    (wire) =>
      (wire.from === fromUid && wire.to === toUid) || (wire.from === toUid && wire.to === fromUid),
  )
  if (duplicate) {
    return { valid: false, code: 'DUPLICATE', message: 'Эти клеммы уже соединены' }
  }
  if (from.kind === 'N' && to.kind === 'PE') {
    return {
      valid: false,
      code: 'NP_TIE',
      severity: 'error',
      message: 'N и PE нельзя объединять после разделения PEN — это создаёт опасный потенциал',
    }
  }
  if (from.kind === 'PE' && to.kind === 'N') {
    return {
      valid: false,
      code: 'NP_TIE',
      severity: 'error',
      message: 'N и PE нельзя объединять после разделения PEN — это создаёт опасный потенциал',
    }
  }
  if (from.kind === 'PE' || to.kind === 'PE') {
    if (from.kind !== 'PE' || to.kind !== 'PE') {
      return {
        valid: false,
        code: 'PE_MIXED',
        severity: 'error',
        message: 'Клемма PE не может соединяться с фазой или нейтралью',
      }
    }
  }
  if ((isPhase(from.kind) && to.kind === 'N') || (from.kind === 'N' && isPhase(to.kind))) {
    return {
      valid: false,
      code: 'PHASE_NEUTRAL',
      severity: 'error',
      message: 'Прямое соединение фазы с нейтралью — короткое замыкание',
    }
  }
  if (isPhase(from.kind) && isPhase(to.kind) && from.kind !== to.kind) {
    const fromComponent = layout.components.find(
      (component) => component.placed.uid === from.componentUid,
    )
    const toComponent = layout.components.find(
      (component) => component.placed.uid === to.componentUid,
    )
    // Однополюсные и двухполюсные аппараты не привязаны к конкретной фазе:
    // их клемма L1 — обобщённый фазный вход. Подача L2/L3 на такой автомат допустима.
    const genericPhaseInput =
      (fromComponent?.def.poles !== undefined &&
        fromComponent.def.poles <= 2 &&
        (fromComponent.def.category === 'breakers' || fromComponent.def.category === 'rcbo') &&
        from.side === 'in') ||
      (toComponent?.def.poles !== undefined &&
        toComponent.def.poles <= 2 &&
        (toComponent.def.category === 'breakers' || toComponent.def.category === 'rcbo') &&
        to.side === 'in')
    if (!genericPhaseInput) {
      return {
        valid: false,
        code: 'PHASE_PHASE',
        severity: 'error',
        message: `Межфазное замыкание ${from.kind}–${to.kind}: соединять разные фазы напрямую нельзя`,
      }
    }
  }
  // Дополнительный контроль: если обе клеммы находятся за разными УЗО,
  // объединять их нейтрали также нельзя.
  if (from.kind === 'N' && to.kind === 'N') {
    const upstreamFrom = findUpstreamComponents(project, layout, from.componentUid)
    const upstreamTo = findUpstreamComponents(project, layout, to.componentUid)
    const rcdFrom = [...upstreamFrom].find((uid) => {
      const def = layout.components.find((component) => component.placed.uid === uid)?.def
      return def ? isRcd(def) : false
    })
    const rcdTo = [...upstreamTo].find((uid) => {
      const def = layout.components.find((component) => component.placed.uid === uid)?.def
      return def ? isRcd(def) : false
    })
    if (rcdFrom && rcdTo && rcdFrom !== rcdTo) {
      return {
        valid: false,
        code: 'CROSS_RCD_NEUTRAL',
        severity: 'error',
        message: 'Нельзя объединять нейтрали цепей, защищённых разными УЗО',
      }
    }
  }
  return { valid: true }
}

/** Валидация уже проложенных проводов и общая проверка проекта. */
export function validateProject(project: PanelProject, layout: PanelLayout): CalculationIssue[] {
  const issues: CalculationIssue[] = []
  const railMap = new Map(layout.rails.map((rail) => [rail.id, rail]))
  for (const rail of project.rails) {
    const components = project.components.filter((item) => item.dinRailId === rail.id)
    const used = components.reduce((sum, item) => sum + (getComponentDef(item.defId)?.sizeModules ?? 0), 0)
    if (used > rail.capacity) {
      issues.push({
        code: 'RAIL_OVERFLOW',
        severity: 'error',
        title: 'Переполнение DIN-рейки',
        message: `«${rail.name}»: ${used} модулей при ёмкости ${rail.capacity}`,
      })
    }
  }
  for (const placed of project.components) {
    if (!getComponentDef(placed.defId)) {
      issues.push({
        code: 'UNKNOWN_DEF',
        severity: 'error',
        title: 'Неизвестный компонент',
        message: `Компонент ${placed.uid} ссылается на отсутствующее оборудование`,
        componentUid: placed.uid,
      })
    }
    if (!railMap.has(placed.dinRailId)) {
      issues.push({
        code: 'MISSING_RAIL',
        severity: 'error',
        title: 'Компонент вне рейки',
        message: `Компонент ${placed.uid} расположен на несуществующей рейке`,
        componentUid: placed.uid,
      })
    }
  }
  for (const wire of project.wires) {
    const from = layout.terminals.get(wire.from)
    const to = layout.terminals.get(wire.to)
    if (!from || !to) {
      issues.push({
        code: 'DANGLING_WIRE',
        severity: 'error',
        title: 'Провод без клеммы',
        message: 'Один из концов провода указывает на отсутствующую клемму',
      })
      continue
    }
    if (from.kind === 'N' && to.kind === 'PE') {
      issues.push({
        code: 'NP_TIE',
        severity: 'error',
        title: 'Объединены N и PE',
        message: 'Шина N соединена с PE. Разделение PEN должно выполняться до УЗО.',
      })
    }
    if (
      (isPhase(from.kind) && to.kind === 'N') ||
      (from.kind === 'N' && isPhase(to.kind)) ||
      (isPhase(from.kind) && to.kind === 'PE') ||
      (from.kind === 'PE' && isPhase(to.kind))
    ) {
      issues.push({
        code: 'SHORT_CIRCUIT',
        severity: 'error',
        title: 'Прямое короткое замыкание',
        message: 'В схеме есть провод, соединяющий фазу с N или PE.',
      })
    }
  }
  const connectedTerminals = new Set<string>()
  for (const wire of project.wires) {
    connectedTerminals.add(wire.from)
    connectedTerminals.add(wire.to)
  }
  for (const component of layout.components) {
    if (!component.def.protective) continue
    const hasInputWire = component.terminals.some(
      (terminal) => terminal.side === 'in' && connectedTerminals.has(terminal.uid),
    )
    if (!hasInputWire) {
      issues.push({
        code: 'NO_FEED',
        severity: 'warning',
        title: 'Нет питания линии',
        message: `«${component.placed.customName ?? component.def.name}» не подключён к источнику`,
        componentUid: component.placed.uid,
      })
    }
  }
  if (project.supply.mainBreaker === undefined) {
    issues.push({
      code: 'NO_MAIN_BREAKER',
      severity: 'warning',
      title: 'Не задан вводной автомат',
      message: 'Укажите номинал вводного автомата в настройках проекта для проверки селективности.',
    })
  }
  return issues
}
