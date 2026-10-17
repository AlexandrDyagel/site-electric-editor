import type {
  DinRail,
  LayoutComponent,
  LayoutTerminal,
  PanelLayout,
  PanelProject,
  PlacedComponent,
  TerminalDef,
  TerminalSide,
} from '@/types'
import {
  COMPONENT_HEIGHT,
  COMPONENT_GAP,
  MODULE_WIDTH,
  PANEL_PAD,
  RAIL_BAR_HEIGHT,
  RAIL_OFFSET_Y,
  RAIL_STEP,
  RAIL_X,
} from '@/config/editor'
import { getComponentDef } from '@/data/library'

export const FIRST_RAIL_Y = 162

export function terminalUid(
  componentUid: string,
  side: TerminalSide,
  kind: string,
  index: number,
): string {
  return `${componentUid}:${side}:${kind}:${index}`
}

export function railGeometry(rail: DinRail, index: number): {
  index: number
  y: number
  x: number
  width: number
  height: number
} {
  return {
    index,
    y: RAIL_OFFSET_Y + 98 + index * RAIL_STEP,
    x: RAIL_X,
    width: rail.capacity * MODULE_WIDTH,
    height: RAIL_BAR_HEIGHT,
  }
}

function terminalPositions(
  componentUid: string,
  defId: string,
  terminals: TerminalDef[],
  x: number,
  y: number,
  width: number,
  height: number,
): LayoutTerminal[] {
  const sides: TerminalSide[] = ['in', 'out']
  const result: LayoutTerminal[] = []
  for (const side of sides) {
    const sideTerminals = terminals
      .filter((terminal) => terminal.side === side)
      .sort((a, b) => a.index - b.index)
    const count = sideTerminals.length
    if (count === 0) continue
    const pad = count > 4 ? 10 : Math.min(16, width * 0.16)
    const available = Math.max(1, width - pad * 2)
    sideTerminals.forEach((terminal, positionIndex) => {
      const ratio = count === 1 ? 0.5 : positionIndex / (count - 1)
      const terminalX = x + pad + available * ratio
      const terminalY = side === 'in' ? y + 13 : y + height - 13
      const uid = terminalUid(componentUid, side, terminal.kind, terminal.index)
      result.push({
        uid,
        componentUid,
        defId,
        kind: terminal.kind,
        side,
        label: terminal.label ?? terminal.kind,
        x: terminalX,
        y: terminalY,
        coords: { x: terminalX, y: terminalY },
      })
    })
  }
  return result
}

/** Чистая функция раскладки: единственный источник координат компонентов. */
export function buildLayout(project: PanelProject): PanelLayout {
  const rails = project.rails.map((rail, index) => ({ ...rail, ...railGeometry(rail, index) }))
  const railsById = new Map(rails.map((rail) => [rail.id, rail]))
  const components: LayoutComponent[] = []
  for (const placed of project.components) {
    const def = getComponentDef(placed.defId)
    const rail = railsById.get(placed.dinRailId)
    if (!def || !rail) continue
    const width = def.sizeModules * MODULE_WIDTH - COMPONENT_GAP
    const x = rail.x + placed.position * MODULE_WIDTH + COMPONENT_GAP / 2
    const y = rail.y - COMPONENT_HEIGHT - 16
    components.push({
      placed,
      def,
      rail,
      x,
      y,
      width,
      height: COMPONENT_HEIGHT,
      moduleStart: placed.position,
      moduleEnd: placed.position + def.sizeModules,
      terminals: terminalPositions(placed.uid, def.id, def.terminals, x, y, width, COMPONENT_HEIGHT),
    })
  }
  const terminals = new Map<string, LayoutTerminal>()
  for (const component of components) {
    for (const terminal of component.terminals) terminals.set(terminal.uid, terminal)
  }
  const maxCapacity = Math.max(16, ...project.rails.map((rail) => rail.capacity))
  const lastRail = rails[rails.length - 1]
  const width = Math.max(880, RAIL_X * 2 + maxCapacity * MODULE_WIDTH)
  const height = lastRail ? lastRail.y + 112 : FIRST_RAIL_Y + 112
  return {
    components,
    terminals,
    rails,
    width,
    height,
  }
}

export function componentOccupiedModules(project: PanelProject): Map<string, number> {
  const result = new Map<string, number>()
  for (const component of project.components) {
    const def = getComponentDef(component.defId)
    if (!def) continue
    result.set(component.dinRailId, (result.get(component.dinRailId) ?? 0) + def.sizeModules)
  }
  return result
}

export function railFreeModules(project: PanelProject, railId: string): number {
  const rail = project.rails.find((item) => item.id === railId)
  if (!rail) return 0
  const occupied = componentOccupiedModules(project).get(railId) ?? 0
  return Math.max(0, rail.capacity - occupied)
}

export interface ReorderResult {
  components: PlacedComponent[]
  ok: boolean
  reason?: string
}

/**
 * Перестановка компонента с «уплотнением» ряда.
 * Определяем индекс вставки по целевой позиции, затем раскладываем последовательность
 * слева направо. Это даёт предсказуемое перетаскивание без наложений.
 */
export function reorderOnRail(
  project: PanelProject,
  componentUid: string,
  targetRailId: string,
  targetModule: number,
): ReorderResult {
  const moving = project.components.find((item) => item.uid === componentUid)
  if (!moving) return { components: project.components, ok: false, reason: 'Компонент не найден' }
  const movingDef = getComponentDef(moving.defId)
  const targetRail = project.rails.find((rail) => rail.id === targetRailId)
  if (!movingDef || !targetRail) {
    return { components: project.components, ok: false, reason: 'Рейка не найдена' }
  }
  const others = project.components
    .filter((item) => item.uid !== componentUid)
    .filter((item) => item.dinRailId === targetRailId)
    .sort((a, b) => a.position - b.position)
  const insertionIndex = others.filter((item) => item.position < targetModule).length
  const sequence = [...others]
  sequence.splice(insertionIndex, 0, { ...moving, dinRailId: targetRailId })
  let cursor = 0
  const normalized: PlacedComponent[] = []
  for (const item of sequence) {
    const def = getComponentDef(item.defId)
    if (!def) continue
    normalized.push({ ...item, dinRailId: targetRailId, position: cursor })
    cursor += def.sizeModules
  }
  if (cursor > targetRail.capacity) {
    return {
      components: project.components,
      ok: false,
      reason: `Недостаточно места на рейке: нужно ${cursor} из ${targetRail.capacity} модулей`,
    }
  }
  const untouched = project.components.filter(
    (item) => item.uid !== componentUid && item.dinRailId !== targetRailId,
  )
  return { components: [...untouched, ...normalized], ok: true }
}

/** Вставка нового оборудования в указанную точку рейки. */
export function placeComponentOnRail(
  project: PanelProject,
  placed: PlacedComponent,
  railId: string,
  targetModule: number,
): { components: PlacedComponent[]; ok: boolean; reason?: string } {
  const rail = project.rails.find((item) => item.id === railId)
  const def = getComponentDef(placed.defId)
  if (!rail || !def) return { components: project.components, ok: false, reason: 'Рейка не найдена' }
  const sameRail = project.components
    .filter((item) => item.dinRailId === railId)
    .sort((a, b) => a.position - b.position)
  const insertionIndex = sameRail.filter((item) => item.position < targetModule).length
  const sequence = [...sameRail]
  sequence.splice(insertionIndex, 0, { ...placed, dinRailId: railId })
  let cursor = 0
  const normalized: PlacedComponent[] = []
  for (const item of sequence) {
    const itemDef = getComponentDef(item.defId)
    if (!itemDef) continue
    normalized.push({ ...item, dinRailId: railId, position: cursor })
    cursor += itemDef.sizeModules
  }
  if (cursor > rail.capacity) {
    return {
      components: project.components,
      ok: false,
      reason: `На рейке «${rail.name}» не хватает ${cursor - rail.capacity} модулей`,
    }
  }
  const untouched = project.components.filter((item) => item.dinRailId !== railId)
  return { components: [...untouched, ...normalized], ok: true }
}

/** Первая рейка, где хватает свободного места. */
export function findRailForNewComponent(
  project: PanelProject,
  modules: number,
): { railId: string; position: number } | null {
  for (const rail of project.rails) {
    const used = project.components
      .filter((item) => item.dinRailId === rail.id)
      .reduce((sum, item) => sum + (getComponentDef(item.defId)?.sizeModules ?? 0), 0)
    if (used + modules <= rail.capacity) {
      return { railId: rail.id, position: used }
    }
  }
  return null
}

export function worldPointFromScreen(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  view: { x: number; y: number; scale: number },
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - view.x) / view.scale,
    y: (clientY - rect.top - view.y) / view.scale,
  }
}

export function moduleFromWorldX(layout: PanelLayout, worldX: number): number {
  const rail = layout.rails[0]
  if (!rail) return 0
  return Math.max(0, Math.round((worldX - rail.x) / MODULE_WIDTH))
}

export function railAtWorldY(layout: PanelLayout, worldY: number): number {
  if (layout.rails.length === 0) return -1
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  layout.rails.forEach((rail, index) => {
    const center = rail.y - COMPONENT_HEIGHT / 2
    const distance = Math.abs(center - worldY)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

export function layoutBounds(layout: PanelLayout): {
  x: number
  y: number
  width: number
  height: number
} {
  return {
    x: PANEL_PAD / 2,
    y: 18,
    width: layout.width - PANEL_PAD,
    height: layout.height - 24,
  }
}
