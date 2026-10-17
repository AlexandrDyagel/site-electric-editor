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
  /** Фактическая позиция после привязки к свободному окну. */
  position?: number
  /** true, если точная позиция была занята и выбрано ближайшее окно. */
  snapped?: boolean
  kind?: 'free' | 'swap' | 'reorder'
  targetUid?: string
}

interface OccupiedInterval {
  start: number
  end: number
}

function componentSize(component: PlacedComponent): number {
  return getComponentDef(component.defId)?.sizeModules ?? 0
}

function occupiedIntervals(
  project: PanelProject,
  railId: string,
  ignoreUid?: string,
): OccupiedInterval[] {
  return project.components
    .filter((item) => item.dinRailId === railId && item.uid !== ignoreUid)
    .map((item) => {
      const size = componentSize(item)
      return { start: item.position, end: item.position + size }
    })
    .filter((interval) => interval.end > interval.start)
}

/**
 * Ближайшая свободная позиция для окна шириной sizeModules.
 * Сначала проверяется точная позиция из drop, затем — соседние позиции сетки.
 * Компоненты не сдвигаются: пользователь может оставлять свободные модули.
 */
export function findFreeModule(
  project: PanelProject,
  railId: string,
  desiredModule: number,
  sizeModules: number,
  ignoreUid?: string,
): number | null {
  const rail = project.rails.find((item) => item.id === railId)
  if (!rail || sizeModules <= 0) return null
  const maxStart = rail.capacity - sizeModules
  if (maxStart < 0) return null
  const target = clampNumber(Math.round(desiredModule), 0, maxStart)
  const intervals = occupiedIntervals(project, railId, ignoreUid)
  const isFree = (position: number): boolean =>
    position >= 0 &&
    position <= maxStart &&
    intervals.every((interval) => position + sizeModules <= interval.start || position >= interval.end)
  if (isFree(target)) return target
  for (let distance = 1; distance <= rail.capacity; distance += 1) {
    const right = target + distance
    if (right <= maxStart && isFree(right)) return right
    const left = target - distance
    if (left >= 0 && isFree(left)) return left
  }
  return null
}

/** Компонент, с которым пересекается предлагаемое окно перемещения. */
export function findOverlapTarget(
  project: PanelProject,
  railId: string,
  startModule: number,
  sizeModules: number,
  ignoreUid?: string,
): PlacedComponent | null {
  const start = startModule
  const end = startModule + sizeModules
  const candidates = project.components
    .filter((item) => item.dinRailId === railId && item.uid !== ignoreUid)
    .map((item) => {
      const size = componentSize(item)
      const overlap = Math.max(0, Math.min(end, item.position + size) - Math.max(start, item.position))
      return { item, overlap, distance: Math.abs(item.position - start) }
    })
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.distance - b.distance)
  return candidates[0]?.item ?? null
}

function validRailPlacement(
  components: PlacedComponent[],
  rails: PanelProject['rails'],
): boolean {
  const capacities = new Map(rails.map((rail) => [rail.id, rail.capacity]))
  const byRail = new Map<string, OccupiedInterval[]>()
  for (const component of components) {
    const capacity = capacities.get(component.dinRailId)
    const size = componentSize(component)
    if (capacity === undefined || size <= 0) return false
    if (component.position < 0 || component.position + size > capacity) return false
    const list = byRail.get(component.dinRailId) ?? []
    list.push({ start: component.position, end: component.position + size })
    byRail.set(component.dinRailId, list)
  }
  for (const list of byRail.values()) {
    list.sort((a, b) => a.start - b.start)
    for (let index = 1; index < list.length; index += 1) {
      const previous = list[index - 1]
      const current = list[index]
      if (previous && current && current.start < previous.end) return false
    }
  }
  return true
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface GroupMovePosition {
  railId: string
  position: number
}

export interface GroupMovePlan {
  positions: Map<string, GroupMovePosition>
  /** Фактический сдвиг после поиска ближайшего свободного окна. */
  deltaModules: number
  deltaRails: number
}

/**
 * План группового перемещения: все выбранные аппараты сдвигаются на одинаковое
 * число модулей и реек, сохраняя взаимное расположение. Проверяются границы,
 * столкновения с невыбранными аппаратами и наложения внутри группы.
 */
export function findGroupMove(
  project: PanelProject,
  componentUids: string[],
  desiredDeltaModules: number,
  desiredDeltaRails: number,
): GroupMovePlan | null {
  const selected = new Set(componentUids)
  const items = project.components.filter((component) => selected.has(component.uid))
  if (items.length === 0) return null
  const railIndexes = new Map(project.rails.map((rail, index) => [rail.id, index]))
  for (const item of items) {
    if (!railIndexes.has(item.dinRailId) || componentSize(item) <= 0) return null
  }

  const buildPlan = (deltaModules: number, deltaRails: number): Map<string, GroupMovePosition> | null => {
    const positions = new Map<string, GroupMovePosition>()
    const intervals = new Map<string, OccupiedInterval[]>()
    const addInterval = (railId: string, start: number, end: number): void => {
      const list = intervals.get(railId) ?? []
      list.push({ start, end })
      intervals.set(railId, list)
    }

    for (const item of project.components) {
      if (selected.has(item.uid)) continue
      addInterval(item.dinRailId, item.position, item.position + componentSize(item))
    }
    for (const item of items) {
      const sourceRailIndex = railIndexes.get(item.dinRailId)
      if (sourceRailIndex === undefined) return null
      const targetRailIndex = sourceRailIndex + deltaRails
      const targetRail = project.rails[targetRailIndex]
      if (!targetRail) return null
      const size = componentSize(item)
      const position = item.position + deltaModules
      if (position < 0 || position + size > targetRail.capacity) return null
      positions.set(item.uid, { railId: targetRail.id, position })
      addInterval(targetRail.id, position, position + size)
    }
    for (const list of intervals.values()) {
      list.sort((a, b) => a.start - b.start)
      for (let index = 1; index < list.length; index += 1) {
        const previous = list[index - 1]
        const current = list[index]
        if (previous && current && current.start < previous.end) return null
      }
    }
    return positions
  }

  const desiredModules = Math.round(desiredDeltaModules)
  const desiredRails = Math.round(desiredDeltaRails)
  const limit = Math.max(...project.rails.map((rail) => rail.capacity), 24) * 2
  for (let distance = 0; distance <= limit; distance += 1) {
    const candidates = distance === 0 ? [desiredModules] : [desiredModules + distance, desiredModules - distance]
    for (const deltaModules of candidates) {
      const positions = buildPlan(deltaModules, desiredRails)
      if (positions) return { positions, deltaModules, deltaRails: desiredRails }
    }
  }
  return null
}

/**
 * Перемещение аппарата по рейке.
 * 1. Свободное окно в точке drop — точная позиция с сохранением промежутков.
 * 2. Drop на другой аппарат — обмен местами, если после него нет наложений.
 * 3. Если обмен невозможен из-за разной ширины — вставка с перестройкой ряда.
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
  const requested = clampNumber(
    Math.round(targetModule),
    0,
    Math.max(0, targetRail.capacity - movingDef.sizeModules),
  )
  const free = findFreeModule(
    project,
    targetRailId,
    requested,
    movingDef.sizeModules,
    componentUid,
  )
  if (free === requested) {
    return {
      components: project.components.map((item) =>
        item.uid === componentUid ? { ...item, dinRailId: targetRailId, position: requested } : item,
      ),
      ok: true,
      position: requested,
      snapped: false,
      kind: 'free',
    }
  }

  const target = findOverlapTarget(
    project,
    targetRailId,
    requested,
    movingDef.sizeModules,
    componentUid,
  )
  if (target) {
    const swapped = project.components.map((item) => {
      if (item.uid === componentUid) {
        return { ...item, dinRailId: targetRailId, position: target.position }
      }
      if (item.uid === target.uid) {
        return { ...item, dinRailId: moving.dinRailId, position: moving.position }
      }
      return item
    })
    if (validRailPlacement(swapped, project.rails)) {
      return {
        components: swapped,
        ok: true,
        position: target.position,
        snapped: false,
        kind: 'swap',
        targetUid: target.uid,
      }
    }

    // Если аппараты разной ширины, прямой обмен стартовыми позициями даёт
    // наложение на соседний модуль. Меняем порядок двух аппаратов в ряду и
    // пересобираем участок от более левого из них: так 4P и 3P обмениваются
    // местами, а соседний 1P сдвигается на освободившийся модуль.
    if (moving.dinRailId === targetRailId) {
      const railItems = project.components
        .filter((item) => item.dinRailId === targetRailId)
        .sort((a, b) => a.position - b.position)
      const movingIndex = railItems.findIndex((item) => item.uid === componentUid)
      const targetIndex = railItems.findIndex((item) => item.uid === target.uid)
      if (movingIndex >= 0 && targetIndex >= 0) {
        const reordered = [...railItems]
        const movingItem = reordered[movingIndex]
        const targetItem = reordered[targetIndex]
        if (movingItem && targetItem) {
          reordered[movingIndex] = targetItem
          reordered[targetIndex] = movingItem
          const anchorIndex = Math.min(movingIndex, targetIndex)
          const anchorPosition = railItems[anchorIndex]?.position ?? 0
          const placeFrom = (startPosition: number, fromIndex: number): Map<string, number> | null => {
            const placements = new Map<string, number>()
            let cursor = startPosition
            for (let index = fromIndex; index < reordered.length; index += 1) {
              const item = reordered[index]
              if (!item) continue
              placements.set(item.uid, cursor)
              cursor += componentSize(item)
            }
            return cursor <= targetRail.capacity ? placements : null
          }
          const placements =
            placeFrom(anchorPosition, anchorIndex) ??
            placeFrom(0, 0)
          if (placements) {
            const sequenceSwapped = project.components.map((item) => {
              const position = placements.get(item.uid)
              return position === undefined ? item : { ...item, dinRailId: targetRailId, position }
            })
            if (validRailPlacement(sequenceSwapped, project.rails)) {
              const position = placements.get(componentUid) ?? target.position
              return {
                components: sequenceSwapped,
                ok: true,
                position,
                snapped: false,
                kind: 'swap',
                targetUid: target.uid,
              }
            }
          }
        }
      }
    }
  }

  // Резервный сценарий для аппаратов разной ширины: вставляем в позицию
  // drop и уплотняем только целевой ряд, сохраняя остальные рейки.
  const sameRail = project.components
    .filter((item) => item.dinRailId === targetRailId && item.uid !== componentUid)
    .sort((a, b) => a.position - b.position)
  const insertionIndex = sameRail.filter((item) => item.position < requested).length
  const sequence = [...sameRail]
  sequence.splice(insertionIndex, 0, { ...moving, dinRailId: targetRailId })
  let cursor = 0
  const normalized: PlacedComponent[] = []
  for (const item of sequence) {
    const size = componentSize(item)
    normalized.push({ ...item, dinRailId: targetRailId, position: cursor })
    cursor += size
  }
  if (cursor > targetRail.capacity) {
    return {
      components: project.components,
      ok: false,
      reason: `На рейке «${targetRail.name}» не хватает ${cursor - targetRail.capacity} модулей`,
    }
  }
  const untouched = project.components.filter(
    (item) => item.uid !== componentUid && item.dinRailId !== targetRailId,
  )
  const result = [...untouched, ...normalized]
  if (!validRailPlacement(result, project.rails)) {
    return { components: project.components, ok: false, reason: 'Не удалось перестроить ряд' }
  }
  const position = normalized.find((item) => item.uid === componentUid)?.position ?? requested
  return {
    components: result,
    ok: true,
    position,
    snapped: position !== requested,
    kind: 'reorder',
  }
}

/** Вставка нового оборудования в точку drop без сдвига остальных аппаратов. */
export function placeComponentOnRail(
  project: PanelProject,
  placed: PlacedComponent,
  railId: string,
  targetModule: number,
): ReorderResult {
  const rail = project.rails.find((item) => item.id === railId)
  const def = getComponentDef(placed.defId)
  if (!rail || !def) return { components: project.components, ok: false, reason: 'Рейка не найдена' }
  const requested = clampNumber(Math.round(targetModule), 0, Math.max(0, rail.capacity - def.sizeModules))
  const position = findFreeModule(project, railId, requested, def.sizeModules, placed.uid)
  if (position === null) {
    return {
      components: project.components,
      ok: false,
      reason: `На рейке «${rail.name}» нет свободного окна на ${def.sizeModules} модулей`,
    }
  }
  return {
    components: [
      ...project.components.filter((item) => item.uid !== placed.uid),
      { ...placed, dinRailId: railId, position },
    ],
    ok: true,
    position,
    snapped: position !== requested,
  }
}

/** Первая рейка, где есть непрерывное свободное окно нужной ширины. */
export function findRailForNewComponent(
  project: PanelProject,
  modules: number,
): { railId: string; position: number } | null {
  for (const rail of project.rails) {
    const used = project.components
      .filter((item) => item.dinRailId === rail.id)
      .reduce((sum, item) => sum + (getComponentDef(item.defId)?.sizeModules ?? 0), 0)
    const position = findFreeModule(project, rail.id, used, modules)
    if (position !== null) return { railId: rail.id, position }
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
