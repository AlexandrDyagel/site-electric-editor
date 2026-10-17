import type { TerminalSide } from '@/types'

export interface Point {
  x: number
  y: number
}

/**
 * Кривая Безье для провода. Направление выхода зависит от стороны клеммы,
 * поэтому линии не проходят сквозь корпус аппарата.
 */
export function bezierPath(from: Point, to: Point, fromSide: TerminalSide, toSide: TerminalSide): string {
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  const tension = Math.min(120, Math.max(36, dx * 0.28 + dy * 0.25))
  const fromDirection = fromSide === 'out' ? 1 : -1
  const toDirection = toSide === 'out' ? 1 : -1
  const cp1 = { x: from.x, y: from.y + fromDirection * tension }
  const cp2 = { x: to.x, y: to.y + toDirection * tension }
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`
}

/** Ортогональная трассировка с общей шиной и скруглёнными углами. */
export function orthogonalPath(
  from: Point,
  to: Point,
  fromSide: TerminalSide,
  toSide: TerminalSide,
  railY?: number,
): string {
  const stub = 22
  const fromStubY = from.y + (fromSide === 'out' ? stub : -stub)
  const toStubY = to.y + (toSide === 'out' ? stub : -stub)
  const laneY = railY !== undefined ? railY + 24 : Math.max(fromStubY, toStubY) + 26
  const points: Point[] = [
    from,
    { x: from.x, y: fromStubY },
    { x: from.x, y: laneY },
    { x: to.x, y: laneY },
    { x: to.x, y: toStubY },
    to,
  ]
  return roundedPolyline(points, 7)
}

function roundedPolyline(points: Point[], radius: number): string {
  if (points.length < 2) return ''
  let path = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1]
    const current = points[i]
    const next = points[i + 1]
    if (!previous || !current || !next) continue
    const inLength = Math.hypot(current.x - previous.x, current.y - previous.y)
    const outLength = Math.hypot(next.x - current.x, next.y - current.y)
    const r = Math.min(radius, inLength / 2, outLength / 2)
    if (r <= 0.5) {
      path += ` L ${current.x} ${current.y}`
      continue
    }
    const before = {
      x: current.x + ((previous.x - current.x) / inLength) * r,
      y: current.y + ((previous.y - current.y) / inLength) * r,
    }
    const after = {
      x: current.x + ((next.x - current.x) / outLength) * r,
      y: current.y + ((next.y - current.y) / outLength) * r,
    }
    path += ` L ${before.x.toFixed(2)} ${before.y.toFixed(2)} Q ${current.x} ${current.y} ${after.x.toFixed(2)} ${after.y.toFixed(2)}`
  }
  const last = points[points.length - 1]
  if (last) path += ` L ${last.x} ${last.y}`
  return path
}

export function midpoint(points: [Point, Point]): Point {
  return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
