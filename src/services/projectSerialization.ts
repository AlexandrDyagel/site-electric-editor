import type { CircuitConfig, LoadConsumer, PanelProject, Wire } from '@/types'
import { getComponentDef } from '@/data/library'
import { createUid } from '@/utils/id'

export interface ParseSuccess {
  ok: true
  project: PanelProject
}

export interface ParseFailure {
  ok: false
  error: string
}

export type ParseResult = ParseSuccess | ParseFailure

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Импорт JSON-проекта с проверкой структуры.
 * Некорректные элементы отбрасываем, но критичные ошибки возвращаем пользователю.
 */
export function parseProjectJson(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, error: 'JSON должен быть объектом проекта' }
  if (!Array.isArray(raw.rails) || raw.rails.length === 0) {
    return { ok: false, error: 'В проекте нет DIN-реек' }
  }
  if (!Array.isArray(raw.components)) {
    return { ok: false, error: 'Поле components отсутствует или не является массивом' }
  }
  if (!Array.isArray(raw.wires)) {
    return { ok: false, error: 'Поле wires отсутствует или не является массивом' }
  }
  const supply = isRecord(raw.supply) ? raw.supply : null
  if (!supply) return { ok: false, error: 'Не заданы параметры питания' }
  const phase = supply.phase === 1 ? 1 : supply.phase === 3 ? 3 : null
  if (!phase) return { ok: false, error: 'Количество фаз должно быть 1 или 3' }
  const voltage = asNumber(supply.voltage, phase === 3 ? 400 : 230)
  if (voltage < 100 || voltage > 1000) {
    return { ok: false, error: 'Напряжение должно быть в диапазоне 100–1000 В' }
  }

  const rails = raw.rails
    .filter(isRecord)
    .map((rail, index) => ({
      id: asString(rail.id, `rail-${index + 1}`),
      name: asString(rail.name, `Ряд ${index + 1}`),
      capacity: Math.max(1, Math.min(48, Math.round(asNumber(rail.capacity, 16)))),
    }))
  const railIds = new Set(rails.map((rail) => rail.id))

  const components = raw.components
    .filter(isRecord)
    .filter((component) => {
      const defId = asString(component.defId)
      return getComponentDef(defId) !== undefined
    })
    .map((component, index) => {
      const railId = asString(component.dinRailId)
      return {
        uid: asString(component.uid, createUid('component')),
        defId: asString(component.defId),
        dinRailId: railIds.has(railId) ? railId : (rails[0]?.id ?? ''),
        position: Math.max(0, Math.round(asNumber(component.position, index))),
        ...(typeof component.customName === 'string' && component.customName.trim()
          ? { customName: component.customName }
          : {}),
      }
    })
  const componentUids = new Set(components.map((component) => component.uid))

  const wires: Wire[] = raw.wires
    .filter(isRecord)
    .map((wire): Wire => ({
      uid: asString(wire.uid, createUid('wire')),
      from: asString(wire.from),
      to: asString(wire.to),
      kind:
        wire.kind === 'phase' ||
        wire.kind === 'neutral' ||
        wire.kind === 'ground' ||
        wire.kind === 'jumper'
          ? wire.kind
          : 'phase',
      ...(wire.phase === 'L1' || wire.phase === 'L2' || wire.phase === 'L3'
        ? { phase: wire.phase }
        : {}),
      crossSection: Math.max(0.5, asNumber(wire.crossSection, 2.5)),
      ...(typeof wire.color === 'string' ? { color: wire.color } : {}),
    }))
    .filter((wire) => {
      const fromComponent = wire.from.split(':')[0]
      const toComponent = wire.to.split(':')[0]
      return (
        !!fromComponent &&
        !!toComponent &&
        componentUids.has(fromComponent) &&
        componentUids.has(toComponent)
      )
    })

  const consumers: LoadConsumer[] = Array.isArray(raw.consumers)
    ? raw.consumers
        .filter(isRecord)
        .map((consumer): LoadConsumer => ({
          uid: asString(consumer.uid, createUid('load')),
          name: asString(consumer.name, 'Потребитель'),
          wireUidOrTerminalUid: asString(consumer.wireUidOrTerminalUid),
          powerW: Math.max(0, asNumber(consumer.powerW, 0)),
          cosPhi: Math.min(1, Math.max(0.1, asNumber(consumer.cosPhi, 0.95))),
          utilization: Math.min(1, Math.max(0, asNumber(consumer.utilization, 1))),
          phase: consumer.phase === 3 ? 3 : 1,
          phaseLine:
            consumer.phaseLine === 'L2' || consumer.phaseLine === 'L3'
              ? consumer.phaseLine
              : 'L1',
          loadType: consumer.loadType === 'active' ? 'active' : 'reactive',
        }))
    : []

  const circuits: CircuitConfig[] = Array.isArray(raw.circuits)
    ? raw.circuits
        .filter(isRecord)
        .filter((circuit) => componentUids.has(asString(circuit.componentUid)))
        .map((circuit): CircuitConfig => ({
          componentUid: asString(circuit.componentUid),
          cableSection: Math.max(1.5, asNumber(circuit.cableSection, 2.5)),
          material: circuit.material === 'aluminum' ? 'aluminum' : 'copper',
          insulation: circuit.insulation === 'xlpe' ? 'xlpe' : 'pvc',
          laying:
            circuit.laying === 'air' || circuit.laying === 'ground' ? circuit.laying : 'conduit',
          lengthM: Math.max(0, asNumber(circuit.lengthM, 15)),
          groupCount: Math.max(1, asNumber(circuit.groupCount, 1)),
          ambientC: Math.max(-10, Math.min(60, asNumber(circuit.ambientC, 25))),
        }))
    : []

  const stamp = new Date().toISOString()
  const project: PanelProject = {
    id: asString(raw.id, createUid('project')),
    name: asString(raw.name, 'Импортированный проект'),
    description: asString(raw.description, ''),
    version: 1,
    supply: {
      phase,
      voltage,
      ...(asNumber(supply.mainBreaker, 0) > 0
        ? { mainBreaker: asNumber(supply.mainBreaker, 40) }
        : {}),
      mainBreakerCurve:
        supply.mainBreakerCurve === 'B' ||
        supply.mainBreakerCurve === 'C' ||
        supply.mainBreakerCurve === 'D'
          ? supply.mainBreakerCurve
          : 'C',
    },
    rails,
    components,
    wires,
    consumers,
    circuits,
    createdAt: asString(raw.createdAt, stamp),
    updatedAt: stamp,
  }
  return { ok: true, project }
}

export function serializeProject(project: PanelProject): string {
  return JSON.stringify(project, null, 2)
}

export function downloadTextFile(
  content: string,
  fileName: string,
  mime = 'application/json;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime })
  downloadBlob(blob, fileName)
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
