<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  BoxSelect,
  Check,
  Copy,
  CornerDownRight,
  Grid3X3,
  Hand,
  Info,
  Maximize2,
  MousePointer2,
  Plus,
  Spline,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import type { ComponentCategory, LayoutComponent, LayoutTerminal, Severity, Wire } from '@/types'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { useZoomPan } from '@/composables/useZoomPan'
import {
  COMPONENT_GAP,
  COMPONENT_HEIGHT,
  DRAG_MIME,
  MODULE_WIDTH,
  RAIL_BAR_HEIGHT,
} from '@/config/editor'
import { railAtWorldY, findFreeModule } from '@/services/layoutEngine'
import { bezierPath, clamp, orthogonalPath } from '@/utils/geometry'
import { PHASE_COLORS, TERMINAL_COLORS, wireColor } from '@/utils/wire'
import { formatRub } from '@/utils/format'
import { getComponentDef } from '@/data/library'

const panel = usePanelStore()
const ui = useUiStore()

const canvasArea = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const pending = ref<LayoutTerminal | null>(null)
const pointerWorld = ref({ x: 0, y: 0 })
const hoveredTerminalUid = ref<string | null>(null)
const spaceHeld = ref(false)
const drag = ref<ComponentDrag | null>(null)
const dropPreview = ref<DropPreview | null>(null)
const errorTerminalUids = ref<string[]>([])
let errorFlashTimer: ReturnType<typeof setTimeout> | null = null

const world = computed(() => ({ width: panel.layout.width, height: panel.layout.height }))
const viewport = useZoomPan(canvasArea, () => world.value)
const { view } = viewport

interface ComponentDrag {
  uid: string
  startX: number
  startY: number
  moved: boolean
  railId: string
  module: number
  width: number
  height: number
  modules: number
  grabOffset: number
  valid: boolean
}

interface DropPreview {
  railId: string
  module: number
  x: number
  y: number
  width: number
  height: number
  modules: number
  valid: boolean
}

const ACCENT: Record<ComponentCategory, string> = {
  input: '#facc15',
  breakers: '#f59e0b',
  rcd: '#a3e635',
  rcbo: '#84cc16',
  protection: '#a78bfa',
  metering: '#22d3ee',
  buses: '#38bdf8',
  accessories: '#94a3b8',
}

const COMPONENT_BG: Record<ComponentCategory, string> = {
  input: '#191b16',
  breakers: '#1b1b1c',
  rcd: '#161c17',
  rcbo: '#161c17',
  protection: '#191823',
  metering: '#101c20',
  buses: '#0e1b23',
  accessories: '#161b22',
}

const project = computed(() => panel.project)
const layout = computed(() => panel.layout)
const componentMap = computed(
  () => new Map(layout.value.components.map((component) => [component.placed.uid, component])),
)

const hoveredTerminal = computed(() =>
  hoveredTerminalUid.value ? layout.value.terminals.get(hoveredTerminalUid.value) ?? null : null,
)

const dragGhost = computed(() => {
  if (!drag.value?.moved) return null
  const rail = layout.value.rails.find((item) => item.id === drag.value?.railId)
  if (!rail) return null
  return {
    x: rail.x + drag.value.module * MODULE_WIDTH,
    y: rail.y - COMPONENT_HEIGHT - 16,
    width: drag.value.width,
    height: drag.value.height,
    modules: drag.value.modules,
    valid: drag.value.valid,
  }
})

const pendingTarget = computed(() => {
  if (hoveredTerminal.value && hoveredTerminal.value.uid !== pending.value?.uid) {
    return hoveredTerminal.value
  }
  return pointerWorld.value
})

const pendingPath = computed(() => {
  if (!pending.value) return ''
  const target = pendingTarget.value
  const targetSide = hoveredTerminal.value && hoveredTerminal.value.uid !== pending.value.uid
    ? hoveredTerminal.value.side
    : 'in'
  return pathBetween(pending.value, target, targetSide)
})

const cursorClass = computed(() => {
  if (viewport.isPanning.value) return 'cursor-grabbing'
  if (spaceHeld.value) return 'cursor-grab'
  if (pending.value) return 'cursor-crosshair'
  if (drag.value?.moved) return 'cursor-grabbing'
  return 'cursor-default'
})

const wireCount = computed(() => panel.project.wires.length)

const componentSeverity = computed(() => {
  const map = new Map<string, Exclude<Severity, 'ok'>>()
  const set = (uid: string | undefined, severity: Severity): void => {
    if (!uid || severity === 'ok') return
    const current = map.get(uid)
    if (current === 'error') return
    if (severity === 'error' || !current) map.set(uid, severity)
  }
  for (const issue of panel.calculation.issues) set(issue.componentUid, issue.severity)
  for (const line of panel.calculation.lines) set(line.componentUid, line.status)
  for (const rcd of panel.calculation.rcds) set(rcd.componentUid, rcd.status)
  return map
})

function flashConnectionError(uids: string[]): void {
  errorTerminalUids.value = uids
  if (errorFlashTimer) clearTimeout(errorFlashTimer)
  errorFlashTimer = setTimeout(() => {
    errorTerminalUids.value = []
  }, 2200)
}

function pathBetween(
  from: LayoutTerminal | { x: number; y: number },
  to: LayoutTerminal | { x: number; y: number },
  toSide: 'in' | 'out' = 'in',
): string {
  const fromSide = 'side' in from ? from.side : 'out'
  if (panel.viewMode === 'bezier') return bezierPath(from, to, fromSide, toSide)
  const fromComponent = 'componentUid' in from ? componentMap.value.get(from.componentUid) : null
  const toComponent = 'componentUid' in to ? componentMap.value.get(to.componentUid) : null
  const routeY = Math.max(fromComponent?.rail.y ?? 0, toComponent?.rail.y ?? 0)
  return orthogonalPath(from, to, fromSide, toSide, routeY)
}

const wireViews = computed(() => {
  return panel.project.wires.flatMap((wire) => {
    const from = panel.layout.terminals.get(wire.from)
    const to = panel.layout.terminals.get(wire.to)
    if (!from || !to) return []
    const core = wire.color ?? wireColor(wire.kind, wire.phase)
    return [
      {
        wire,
        from,
        to,
        path: pathBetween(from, to, to.side),
        color: core,
        width: Math.min(4.2, 1.3 + wire.crossSection * 0.16),
        selected: panel.selectedWireUid === wire.uid,
      },
    ]
  })
})

function terminalHitRadius(component: LayoutComponent): number {
  const count = component.terminals.filter((terminal) => terminal.side === 'in').length
  return count > 5 ? 3.2 : 4.2
}

function componentName(component: LayoutComponent): string {
  return component.placed.customName ?? component.def.name
}

function truncated(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length)}…` : value
}

function terminalLabel(terminal: LayoutTerminal): string {
  if (terminal.kind === 'N') return 'N'
  if (terminal.kind === 'PE') return 'PE'
  return terminal.kind
}

function notify(result: { ok: boolean; message: string }, successTitle = 'Готово'): void {
  ui.toast({
    title: result.ok ? successTitle : 'Не удалось',
    ...(result.message && result.message !== successTitle ? { message: result.message } : {}),
    tone: result.ok ? 'success' : 'error',
  })
}

function onSvgPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || spaceHeld.value) return
  const target = event.target as Element | null
  if (
    target?.closest('[data-component]') ||
    target?.closest('[data-terminal]') ||
    target?.closest('[data-wire-hit]')
  ) {
    return
  }
  pending.value = null
  panel.clearSelection()
}

function onTerminalPointerDown(event: PointerEvent, terminal: LayoutTerminal): void {
  event.stopPropagation()
  event.preventDefault()
  if (event.button !== 0 || spaceHeld.value) return
  if (!pending.value) {
    pending.value = terminal
    pointerWorld.value = { x: terminal.x, y: terminal.y }
    return
  }
  if (pending.value.uid === terminal.uid) {
    pending.value = null
    return
  }
  const result = panel.addWire(pending.value.uid, terminal.uid)
  if (!result.ok) flashConnectionError([pending.value.uid, terminal.uid])
  notify(result, 'Провод проложен')
  pending.value = null
}

function onTerminalEnter(terminal: LayoutTerminal): void {
  hoveredTerminalUid.value = terminal.uid
}

function onTerminalLeave(): void {
  hoveredTerminalUid.value = null
}

function worldFromClient(clientX: number, clientY: number): { x: number; y: number } {
  const svg = svgRef.value
  if (!svg) return { x: 0, y: 0 }
  return viewport.screenToWorld(clientX, clientY, svg.getBoundingClientRect())
}

function moduleAtX(worldX: number, railX: number): number {
  return Math.floor((worldX - railX) / MODULE_WIDTH)
}

function startComponentDrag(event: PointerEvent, component: LayoutComponent): void {
  if (event.button !== 0 || spaceHeld.value) return
  event.preventDefault()
  panel.selectComponent(component.placed.uid)
  const point = worldFromClient(event.clientX, event.clientY)
  const grabModule = moduleAtX(point.x, component.rail.x)
  const grabOffset = clamp(grabModule - component.moduleStart, 0, Math.max(0, component.def.sizeModules - 1))
  drag.value = {
    uid: component.placed.uid,
    startX: point.x,
    startY: point.y,
    moved: false,
    railId: component.rail.id,
    module: component.moduleStart,
    width: component.width,
    height: component.height,
    modules: component.def.sizeModules,
    grabOffset,
    valid: true,
  }
  window.addEventListener('pointermove', onComponentDragMove)
  window.addEventListener('pointerup', onComponentDragEnd)
  window.addEventListener('pointercancel', onComponentDragEnd)
}

function onComponentDragMove(event: PointerEvent): void {
  if (!drag.value) return
  const point = worldFromClient(event.clientX, event.clientY)
  if (Math.hypot(point.x - drag.value.startX, point.y - drag.value.startY) > 4) {
    drag.value.moved = true
  }
  if (!drag.value.moved) return
  const railIndex = railAtWorldY(layout.value, point.y)
  const rail = layout.value.rails[railIndex]
  const component = componentMap.value.get(drag.value.uid)
  if (!rail || !component) return
  const requested = clamp(
    moduleAtX(point.x, rail.x) - drag.value.grabOffset,
    0,
    Math.max(0, rail.capacity - component.def.sizeModules),
  )
  const free = findFreeModule(
    project.value,
    rail.id,
    requested,
    component.def.sizeModules,
    component.placed.uid,
  )
  drag.value.valid = free !== null
  drag.value.module = free ?? requested
  drag.value.railId = rail.id
}

function onComponentDragEnd(): void {
  window.removeEventListener('pointermove', onComponentDragMove)
  window.removeEventListener('pointerup', onComponentDragEnd)
  window.removeEventListener('pointercancel', onComponentDragEnd)
  const current = drag.value
  drag.value = null
  if (!current?.moved) return
  if (!current.valid) {
    ui.toast({
      title: 'Нет свободного места',
      message: 'На этой рейке нет непрерывного окна нужной ширины.',
      tone: 'error',
    })
    return
  }
  const result = panel.moveComponent(current.uid, current.railId, current.module)
  notify(result, 'Компонент перемещён')
}

function onWheel(event: WheelEvent): void {
  const factor = event.deltaY < 0 ? 1.1 : 0.91
  viewport.zoomAtClient(event.clientX, event.clientY, factor)
}

function onPanMove(event: PointerEvent): void {
  viewport.updatePan(event.clientX, event.clientY)
}

function onPanEnd(): void {
  viewport.endPan()
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanEnd)
}

function onPointerDownCapture(event: PointerEvent): void {
  const isTouchBackground =
    event.pointerType === 'touch' &&
    !(event.target as Element | null)?.closest('[data-component], [data-terminal], [data-wire-hit]')
  if (event.button !== 1 && !spaceHeld.value && !isTouchBackground) return
  event.preventDefault()
  event.stopPropagation()
  viewport.beginPan(event.clientX, event.clientY)
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanEnd, { once: true })
}

function onWindowPointerMove(event: PointerEvent): void {
  if (!pending.value || !svgRef.value) return
  const point = worldFromClient(event.clientX, event.clientY)
  pointerWorld.value = point
}

function onCanvasDrop(event: DragEvent): void {
  event.preventDefault()
  const defId =
    event.dataTransfer?.getData(DRAG_MIME) ||
    event.dataTransfer?.getData('text/plain') ||
    ui.draggedDefId ||
    ''
  dropPreview.value = null
  ui.draggedDefId = null
  if (!defId) return
  const def = getComponentDef(defId)
  if (!def) {
    ui.toast({ title: 'Ошибка', message: 'Компонент не найден', tone: 'error' })
    return
  }
  const point = worldFromClient(event.clientX, event.clientY)
  const railIndex = railAtWorldY(layout.value, point.y)
  const rail = layout.value.rails[railIndex]
  if (!rail) return
  const module = clamp(
    moduleAtX(point.x, rail.x),
    0,
    Math.max(0, rail.capacity - def.sizeModules),
  )
  notify(panel.addComponent(def.id, { railId: rail.id, module }), 'Компонент добавлен')
}

function onCanvasDragOver(event: DragEvent): void {
  if (!event.dataTransfer) return
  const types = Array.from(event.dataTransfer.types)
  const defId =
    ui.draggedDefId ||
    event.dataTransfer.getData(DRAG_MIME) ||
    event.dataTransfer.getData('text/plain')
  const def = defId ? getComponentDef(defId) : undefined
  if (!def) return
  if (!types.includes(DRAG_MIME) && !types.includes('text/plain')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  const point = worldFromClient(event.clientX, event.clientY)
  const rail = layout.value.rails[railAtWorldY(layout.value, point.y)]
  if (!rail) return
  const requested = clamp(
    moduleAtX(point.x, rail.x),
    0,
    Math.max(0, rail.capacity - def.sizeModules),
  )
  const free = findFreeModule(project.value, rail.id, requested, def.sizeModules)
  const module = free ?? requested
  dropPreview.value = {
    railId: rail.id,
    module,
    x: rail.x + module * MODULE_WIDTH,
    y: rail.y - COMPONENT_HEIGHT - 16,
    width: def.sizeModules * MODULE_WIDTH - COMPONENT_GAP,
    height: COMPONENT_HEIGHT,
    modules: def.sizeModules,
    valid: free !== null,
  }
}

function onCanvasDragLeave(event: DragEvent): void {
  const related = event.relatedTarget as Node | null
  if (related && canvasArea.value?.contains(related)) return
  dropPreview.value = null
}

function addRail(): void {
  notify(panel.addRail(), 'Рейка добавлена')
}

function selectWire(wire: Wire): void {
  panel.selectWire(wire.uid)
}

function deleteSelection(): void {
  if (panel.selectedWireUid) {
    notify(panel.removeWire(panel.selectedWireUid), 'Провод удалён')
    return
  }
  if (panel.selectedComponentUid) {
    notify(panel.removeComponent(panel.selectedComponentUid), 'Компонент удалён')
  }
}

function duplicateSelection(): void {
  if (!panel.selectedComponentUid) return
  notify(panel.duplicateComponent(panel.selectedComponentUid), 'Копия создана')
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  if (element.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return Boolean(element.closest('button, a, [role="button"], summary'))
}

function onKeyDown(event: KeyboardEvent): void {
  // Пока открыто модальное окно, горячие клавиши холста не должны менять схему.
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
  if (isTextEntryTarget(event.target)) return
  const modifier = event.ctrlKey || event.metaKey
  if (event.code === 'Space') {
    if (isInteractiveTarget(event.target)) return
    if (!spaceHeld.value) {
      spaceHeld.value = true
      event.preventDefault()
    }
    return
  }
  if (event.key === 'Escape') {
    if (drag.value) {
      window.removeEventListener('pointermove', onComponentDragMove)
      window.removeEventListener('pointerup', onComponentDragEnd)
      drag.value = null
    }
    if (pending.value) pending.value = null
    else panel.clearSelection()
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && (panel.selectedWireUid || panel.selectedComponentUid)) {
    event.preventDefault()
    deleteSelection()
    return
  }
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) panel.redo()
    else panel.undo()
    return
  }
  if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    panel.redo()
    return
  }
  if (modifier && event.key.toLowerCase() === 'd' && panel.selectedComponentUid) {
    event.preventDefault()
    duplicateSelection()
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.code === 'Space') spaceHeld.value = false
}

function resetSpace(): void {
  spaceHeld.value = false
}

let resizeObserver: ResizeObserver | null = null
let hasFitted = false
let rafId = 0

onMounted(() => {
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', resetSpace)
  if (canvasArea.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!hasFitted) {
        viewport.fit(36)
        if (canvasArea.value && canvasArea.value.clientWidth > 200) hasFitted = true
      }
    })
    resizeObserver.observe(canvasArea.value)
  }
  rafId = window.requestAnimationFrame(() => {
    viewport.fit(36)
    hasFitted = true
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', resetSpace)
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanEnd)
  window.removeEventListener('pointermove', onComponentDragMove)
  window.removeEventListener('pointerup', onComponentDragEnd)
  window.cancelAnimationFrame(rafId)
  if (errorFlashTimer) clearTimeout(errorFlashTimer)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-ink-950">
    <div class="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-white/[.07] bg-ink-900/80 px-2.5 sm:px-3">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-1.5 text-[10px] font-bold text-cloud-300 transition hover:border-white/20 hover:text-white"
          title="Добавить DIN-рейку"
          @click="addRail"
        >
          <Plus :size="12" />
          <span class="hidden sm:inline">Рейка</span>
        </button>
        <div class="hidden h-5 w-px bg-white/10 sm:block"></div>
        <div class="flex items-center rounded-lg border border-white/10 bg-white/[.035] p-0.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold transition"
            :class="panel.viewMode === 'bezier' ? 'bg-white/[.1] text-white' : 'text-cloud-400 hover:text-white'"
            title="Кривые Безье"
            @click="panel.setViewMode('bezier')"
          >
            <Spline :size="12" />
            <span class="hidden md:inline">Безье</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold transition"
            :class="panel.viewMode === 'orthogonal' ? 'bg-white/[.1] text-white' : 'text-cloud-400 hover:text-white'"
            title="Ортогональная трассировка"
            @click="panel.setViewMode('orthogonal')"
          >
            <CornerDownRight :size="12" />
            <span class="hidden md:inline">Орто</span>
          </button>
        </div>
        <span class="hidden items-center gap-1.5 rounded-full border border-white/[.07] px-2 py-1 font-mono text-[8px] text-cloud-400/60 sm:inline-flex">
          <Grid3X3 :size="10" /> сетка 17,5 мм
        </span>
      </div>

      <div class="flex items-center gap-1.5">
        <span class="hidden items-center gap-1.5 font-mono text-[9px] text-cloud-400/60 sm:inline-flex">
          <span class="h-1.5 w-1.5 rounded-full" :class="wireCount ? 'bg-sky-400' : 'bg-white/20'"></span>
          {{ wireCount }} проводов
        </span>
        <div class="flex items-center rounded-lg border border-white/10 bg-white/[.035]">
          <button
            type="button"
            class="p-1.5 text-cloud-400 transition hover:text-white disabled:opacity-30"
            :disabled="!viewport.canZoomOut.value"
            aria-label="Уменьшить масштаб"
            @click="viewport.zoomOut"
          >
            <ZoomOut :size="13" />
          </button>
          <button type="button" class="min-w-[38px] px-1 font-mono text-[9px] text-cloud-300" @click="viewport.fit(36)">
            {{ viewport.zoomPercent.value }}%
          </button>
          <button
            type="button"
            class="p-1.5 text-cloud-400 transition hover:text-white disabled:opacity-30"
            :disabled="!viewport.canZoomIn.value"
            aria-label="Увеличить масштаб"
            @click="viewport.zoomIn"
          >
            <ZoomIn :size="13" />
          </button>
        </div>
        <button
          type="button"
          class="rounded-lg border border-white/10 bg-white/[.035] p-1.5 text-cloud-400 transition hover:text-white"
          title="Вписать щит в экран"
          @click="viewport.fit(36)"
        >
          <Maximize2 :size="13" />
        </button>
      </div>
    </div>

    <div
      ref="canvasArea"
      class="relative min-h-0 flex-1 touch-none overflow-hidden bg-ink-950"
      :class="cursorClass"
      @wheel.prevent="onWheel"
      @dragover="onCanvasDragOver"
      @drop="onCanvasDrop"
      @dragleave="onCanvasDragLeave"
      @pointerdown.capture="onPointerDownCapture"
    >
      <div class="pointer-events-none absolute inset-0 bg-grid-dark bg-[size:28px_28px] opacity-50"></div>
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(174,239,28,.035),transparent_55%)]"></div>

      <svg
        ref="svgRef"
        id="panel-canvas-svg"
        class="relative h-full w-full"
        :data-world-width="world.width"
        :data-world-height="world.height"
        @pointerdown="onSvgPointerDown"
      >
        <defs>
          <pattern id="panel-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#ffffff" stroke-opacity="0.025" stroke-width="1" />
          </pattern>
          <linearGradient id="panel-surface" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0e151f" />
            <stop offset="100%" stop-color="#0a1017" />
          </linearGradient>
          <linearGradient id="din-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#546171" />
            <stop offset="38%" stop-color="#9aa8b8" />
            <stop offset="55%" stop-color="#647386" />
            <stop offset="100%" stop-color="#333f4d" />
          </linearGradient>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g :transform="`translate(${view.x} ${view.y}) scale(${view.scale})`" data-canvas-world>
          <rect
            :x="8"
            :y="8"
            :width="world.width - 16"
            :height="world.height - 16"
            rx="18"
            fill="url(#panel-surface)"
            stroke="#263445"
            stroke-width="1.2"
          />
          <rect
            :x="9"
            :y="9"
            :width="world.width - 18"
            :height="world.height - 18"
            rx="17"
            fill="url(#panel-grid)"
          />

          <text :x="30" :y="31" fill="#526174" font-family="JetBrains Mono Variable, monospace" font-size="7" letter-spacing="1.5">
            VOLT.LAB / PANEL
          </text>
          <text :x="world.width - 30" :y="31" text-anchor="end" fill="#526174" font-family="JetBrains Mono Variable, monospace" font-size="7">
            {{ project.supply.phase === 3 ? '3Ф 400В' : '1Ф 230В' }} · {{ project.supply.mainBreaker ?? '—' }}A
          </text>

          <g v-for="rail in layout.rails" :key="rail.id">
            <rect
              :x="rail.x"
              :y="rail.y"
              :width="rail.width"
              :height="RAIL_BAR_HEIGHT"
              rx="2.5"
              fill="url(#din-rail)"
              opacity="0.9"
            />
            <rect :x="rail.x" :y="rail.y + 3.5" :width="rail.width" :height="2" rx="1" fill="#c7d2df" opacity="0.22" />
            <text
              :x="rail.x + 4"
              :y="rail.y + 33"
              fill="#58687b"
              font-family="JetBrains Mono Variable, monospace"
              font-size="6.5"
              letter-spacing="0.5"
            >
              {{ rail.name.toUpperCase() }}
            </text>
            <text
              :x="rail.x + rail.width"
              :y="rail.y + 33"
              text-anchor="end"
              fill="#37485b"
              font-family="JetBrains Mono Variable, monospace"
              font-size="6"
            >
              {{ rail.capacity }} МОД.
            </text>
          </g>

          <g class="wires">
            <g v-for="wireView in wireViews" :key="wireView.wire.uid">
              <path
                :d="wireView.path"
                fill="none"
                stroke="#dbe7f4"
                stroke-opacity="0.14"
                :stroke-width="wireView.width + 3.5"
                stroke-linecap="round"
                pointer-events="none"
              />
              <path
                :d="wireView.path"
                fill="none"
                :stroke="wireView.color"
                :stroke-width="wireView.width + (wireView.selected ? 1.2 : 0)"
                stroke-linecap="round"
                :stroke-dasharray="wireView.wire.kind === 'jumper' ? '5 3' : undefined"
                :filter="wireView.selected ? 'url(#soft-glow)' : undefined"
                pointer-events="none"
              />
              <path
                :d="wireView.path"
                data-wire-hit
                fill="none"
                stroke="transparent"
                stroke-width="13"
                stroke-linecap="round"
                class="cursor-pointer"
                @pointerdown.stop="selectWire(wireView.wire)"
              />
              <circle
                v-if="wireView.selected"
                :cx="wireView.to.x"
                :cy="wireView.to.y"
                r="3.2"
                fill="none"
                stroke="#ffffff"
                stroke-width="1"
                pointer-events="none"
              />
            </g>
          </g>

          <g class="components">
            <g
              v-for="component in layout.components"
              :key="component.placed.uid"
              :data-component="component.placed.uid"
              :opacity="drag?.uid === component.placed.uid && drag.moved ? 0.32 : 1"
              class="cursor-pointer"
              @pointerdown.stop="startComponentDrag($event, component)"
            >
              <title>{{ componentName(component) }} · {{ component.def.brand }} · {{ formatRub(component.def.price) }}</title>
              <rect
                :x="component.x"
                :y="component.y"
                :width="component.width"
                :height="component.height"
                rx="3.5"
                :fill="COMPONENT_BG[component.def.category]"
                :stroke="
                  panel.selectedComponentUid === component.placed.uid
                    ? '#bdfa45'
                    : componentSeverity.get(component.placed.uid) === 'error'
                      ? '#fb7185'
                      : componentSeverity.get(component.placed.uid) === 'warning'
                        ? '#fbbf24'
                        : '#344356'
                "
                :stroke-width="
                  panel.selectedComponentUid === component.placed.uid
                    ? 1.6
                    : componentSeverity.has(component.placed.uid)
                      ? 1.2
                      : 0.9
                "
              />
              <rect
                :x="component.x"
                :y="component.y"
                :width="component.width"
                :height="3"
                rx="1.5"
                :fill="ACCENT[component.def.category]"
                opacity="0.9"
              />
              <rect
                :x="component.x + 5"
                :y="component.y + 8"
                :width="component.width - 10"
                :height="12"
                rx="1.5"
                fill="#ffffff"
                opacity="0.035"
              />
              <text
                v-if="component.width >= 64"
                :x="component.x + component.width / 2"
                :y="component.y + 27"
                text-anchor="middle"
                fill="#7b899a"
                font-family="JetBrains Mono Variable, monospace"
                font-size="4.8"
                letter-spacing="0.3"
              >
                {{ truncated(component.def.brand.toUpperCase(), component.width > 120 ? 22 : 12) }}
              </text>
              <text
                :x="component.x + component.width / 2"
                :y="component.y + 47"
                text-anchor="middle"
                fill="#eef3f8"
                font-family="Manrope Variable, sans-serif"
                font-weight="800"
                :font-size="component.width < 60 ? 8.2 : 10.5"
              >
                {{ truncated(component.def.shortName, component.width < 60 ? 7 : 12) }}
              </text>
              <text
                v-if="component.width >= 78"
                :x="component.x + component.width / 2"
                :y="component.y + 59"
                text-anchor="middle"
                fill="#8391a3"
                font-family="JetBrains Mono Variable, monospace"
                font-size="5.2"
              >
                {{ component.def.poles }}P · {{ component.def.ratedCurrent ?? 63 }}A<tspan v-if="component.def.residualCurrent"> · {{ component.def.residualCurrent }}мА</tspan>
              </text>
              <text
                v-if="component.placed.customName"
                :x="component.x + component.width / 2"
                :y="component.y + 82"
                text-anchor="middle"
                fill="#64748b"
                font-family="Manrope Variable, sans-serif"
                font-size="5.5"
              >
                {{ truncated(component.placed.customName, component.width < 60 ? 10 : component.width < 110 ? 16 : 26) }}
              </text>
              <text
                :x="component.x + component.width / 2"
                :y="component.y + component.height - 4"
                text-anchor="middle"
                fill="#42536a"
                font-family="JetBrains Mono Variable, monospace"
                font-size="4.7"
              >
                {{ component.def.sizeModules }} МОД.
              </text>

              <g
                v-for="terminal in component.terminals"
                :key="terminal.uid"
                :data-terminal="terminal.uid"
                :aria-label="`${terminal.label}, ${terminal.side === 'in' ? 'вход' : 'выход'}`"
                class="cursor-crosshair"
                @pointerenter="onTerminalEnter(terminal)"
                @pointerleave="onTerminalLeave"
                @pointerdown.stop.prevent="onTerminalPointerDown($event, terminal)"
              >
                <title>{{ terminal.label }} · {{ terminal.side === 'in' ? 'вход' : 'выход' }}</title>
                <circle :cx="terminal.x" :cy="terminal.y" r="9" fill="transparent" />
                <circle
                  v-if="errorTerminalUids.includes(terminal.uid)"
                  :cx="terminal.x"
                  :cy="terminal.y"
                  r="9"
                  fill="none"
                  stroke="#fb7185"
                  stroke-width="1.6"
                  data-export="ignore"
                  class="animate-pulse-soft"
                />
                <circle
                  v-if="hoveredTerminalUid === terminal.uid || pending?.uid === terminal.uid"
                  :cx="terminal.x"
                  :cy="terminal.y"
                  :r="terminalHitRadius(component) + 3.5"
                  fill="none"
                  :stroke="pending?.uid === terminal.uid ? '#bdfa45' : '#ffffff'"
                  stroke-width="1"
                  opacity="0.9"
                />
                <circle
                  :cx="terminal.x"
                  :cy="terminal.y"
                  :r="terminalHitRadius(component)"
                  :fill="TERMINAL_COLORS[terminal.kind] ?? '#94a3b8'"
                  stroke="#0b1118"
                  stroke-width="1.3"
                />
                <circle
                  :cx="terminal.x"
                  :cy="terminal.y"
                  r="1.2"
                  fill="#0b1118"
                  opacity="0.55"
                />
                <text
                  v-if="hoveredTerminalUid === terminal.uid"
                  :x="terminal.x"
                  :y="terminal.side === 'in' ? terminal.y - 8 : terminal.y + 14"
                  text-anchor="middle"
                  fill="#f4f8fc"
                  stroke="#0b1118"
                  stroke-width="2.8"
                  paint-order="stroke"
                  font-family="JetBrains Mono Variable, monospace"
                  font-size="6.5"
                  pointer-events="none"
                >
                  {{ terminalLabel(terminal) }}
                </text>
              </g>
            </g>
          </g>

          <path
            v-if="pending"
            :d="pendingPath"
            data-export="ignore"
            fill="none"
            stroke="#bdfa45"
            stroke-width="1.8"
            stroke-dasharray="5 4"
            stroke-linecap="round"
            opacity="0.9"
            pointer-events="none"
          />
          <circle
            v-if="pending"
            :cx="pending.x"
            :cy="pending.y"
            r="7"
            data-export="ignore"
            fill="none"
            stroke="#bdfa45"
            stroke-width="1.4"
            opacity="0.8"
            pointer-events="none"
          />

          <g v-if="dragGhost" data-export="ignore" pointer-events="none">
            <rect
              :x="dragGhost.x"
              :y="dragGhost.y"
              :width="dragGhost.width"
              :height="dragGhost.height"
              rx="4"
              :fill="dragGhost.valid ? '#bdfa45' : '#fb7185'"
              fill-opacity="0.08"
              :stroke="dragGhost.valid ? '#bdfa45' : '#fb7185'"
              stroke-width="1.2"
              stroke-dasharray="4 3"
            />
            <text
              :x="dragGhost.x + dragGhost.width / 2"
              :y="dragGhost.y + dragGhost.height / 2 - 3"
              text-anchor="middle"
              :fill="dragGhost.valid ? '#d3ff80' : '#fda4af'"
              font-family="JetBrains Mono Variable, monospace"
              font-size="7"
            >
              {{ dragGhost.valid ? 'ПЕРЕМЕСТИТЬ' : 'НЕТ МЕСТА' }}
            </text>
            <text
              :x="dragGhost.x + dragGhost.width / 2"
              :y="dragGhost.y + dragGhost.height / 2 + 8"
              text-anchor="middle"
              :fill="dragGhost.valid ? '#8fb34a' : '#fb7185'"
              font-family="JetBrains Mono Variable, monospace"
              font-size="5.5"
            >
              {{ dragGhost.modules }} МОД.
            </text>
          </g>

          <g v-if="dropPreview" data-export="ignore" pointer-events="none">
            <rect
              :x="dropPreview.x"
              :y="dropPreview.y"
              :width="dropPreview.width"
              :height="dropPreview.height"
              rx="4"
              :fill="dropPreview.valid ? '#38bdf8' : '#fb7185'"
              fill-opacity="0.07"
              :stroke="dropPreview.valid ? '#38bdf8' : '#fb7185'"
              stroke-width="1.1"
              stroke-dasharray="4 3"
            />
            <text
              :x="dropPreview.x + dropPreview.width / 2"
              :y="dropPreview.y + dropPreview.height / 2 - 3"
              text-anchor="middle"
              :fill="dropPreview.valid ? '#7dd3fc' : '#fda4af'"
              font-family="JetBrains Mono Variable, monospace"
              font-size="6"
            >
              {{ dropPreview.valid ? 'DROP' : 'НЕТ МЕСТА' }}
            </text>
            <text
              :x="dropPreview.x + dropPreview.width / 2"
              :y="dropPreview.y + dropPreview.height / 2 + 8"
              text-anchor="middle"
              :fill="dropPreview.valid ? '#7dd3fc' : '#fb7185'"
              font-family="JetBrains Mono Variable, monospace"
              font-size="5.5"
            >
              {{ dropPreview.modules }} МОД.
            </text>
          </g>
        </g>
      </svg>

      <div class="pointer-events-none absolute left-3 top-3 hidden items-center gap-2 rounded-lg border border-white/10 bg-ink-950/85 px-2.5 py-1.5 backdrop-blur sm:flex">
        <span v-for="(color, label) in { ...PHASE_COLORS, N: '#4f8cff', PE: '#a3e635' }" :key="label" class="inline-flex items-center gap-1 font-mono text-[7px] text-cloud-400">
          <span class="h-1.5 w-5 rounded-full" :style="{ backgroundColor: color }"></span>
          {{ label }}
        </span>
      </div>

      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 translate-y-1"
        leave-active-class="transition duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="pending"
          class="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-volt-400/30 bg-ink-900/95 px-3 py-1.5 shadow-lg backdrop-blur"
        >
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt-400 opacity-60"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-volt-400"></span>
          </span>
          <span class="text-[10px] font-bold text-volt-200">
            Выберите вторую клемму · {{ terminalLabel(pending) }}
          </span>
          <button type="button" class="text-cloud-400 hover:text-white" aria-label="Отменить" @click="pending = null">
            <span class="text-[10px]">Esc</span>
          </button>
        </div>
      </Transition>

      <div
        v-if="panel.project.components.length === 0"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <span class="flex h-16 w-16 items-center justify-center rounded-2xl border border-volt-400/25 bg-volt-400/10 text-volt-300">
          <BoxSelect :size="28" />
        </span>
        <p class="mt-4 text-sm font-extrabold text-white">Перетащите первый аппарат</p>
        <p class="mt-1 max-w-xs text-[11px] leading-5 text-cloud-400">
          Используйте библиотеку слева. Компонент автоматически встанет на свободные модули DIN-рейки.
        </p>
      </div>

      <div class="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-white/[.07] bg-ink-950/80 px-3.5 py-1.5 backdrop-blur md:flex">
        <span class="inline-flex items-center gap-1 text-[8px] text-cloud-400/60"><MousePointer2 :size="9" /> клик — выбрать</span>
        <span class="inline-flex items-center gap-1 text-[8px] text-cloud-400/60"><Hand :size="9" /> пробел / средняя кнопка — панорама</span>
        <span class="inline-flex items-center gap-1 text-[8px] text-cloud-400/60"><ZoomIn :size="9" /> колесо — зум</span>
        <span class="inline-flex items-center gap-1 text-[8px] text-cloud-400/60"><Info :size="9" /> клемма → клемма — провод</span>
      </div>

      <div v-if="panel.selectedComponentUid || panel.selectedWireUid" class="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/95 p-1 shadow-lg backdrop-blur">
        <button
          v-if="panel.selectedComponentUid"
          type="button"
          class="rounded-lg p-2 text-cloud-400 transition hover:bg-white/[.08] hover:text-white"
          title="Дублировать (Ctrl+D)"
          aria-label="Дублировать"
          @click="duplicateSelection"
        >
          <Copy :size="13" />
        </button>
        <button
          type="button"
          class="rounded-lg p-2 text-cloud-400 transition hover:bg-rose-500/15 hover:text-rose-300"
          title="Удалить (Delete)"
          aria-label="Удалить"
          @click="deleteSelection"
        >
          <Trash2 :size="13" />
        </button>
      </div>

      <div class="pointer-events-none absolute right-3 top-3 hidden rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-2.5 py-1 font-mono text-[8px] text-emerald-300 sm:flex sm:items-center sm:gap-1">
        <Check :size="10" /> автосохранение
      </div>
    </div>
  </div>
</template>
