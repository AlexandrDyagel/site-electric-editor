import type {
  CircuitConfig,
  DinRail,
  LoadConsumer,
  PanelProject,
  PlacedComponent,
  Wire,
} from '@/types'
import { terminalUid } from '@/services/layoutEngine'
import { createUid } from '@/utils/id'

const now = (): string => new Date().toISOString()

export function createEmptyProject(name = 'Новый проект щита'): PanelProject {
  const stamp = now()
  const rails: DinRail[] = [
    { id: 'rail-1', name: 'Ряд 1 — ввод', capacity: 16 },
    { id: 'rail-2', name: 'Ряд 2 — отходящие линии', capacity: 16 },
    { id: 'rail-3', name: 'Ряд 3 — распределение', capacity: 16 },
  ]
  return {
    id: createUid('project'),
    name,
    description: 'Черновик схемы щита',
    version: 1,
    supply: { phase: 3, voltage: 400, mainBreaker: 40, mainBreakerCurve: 'C' },
    rails,
    components: [],
    wires: [],
    consumers: [],
    circuits: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
}

function wire(
  from: string,
  to: string,
  kind: Wire['kind'],
  crossSection: number,
  phase?: Wire['phase'],
): Wire {
  return {
    uid: createUid('wire'),
    from,
    to,
    kind,
    crossSection,
    ...(phase ? { phase } : {}),
  }
}

/**
 * Демонстрационный проект — полностью связанная трёхфазная схема.
 * Служит стартовым экраном редактора и примером для новых пользователей.
 */
export function createDemoProject(name = 'Квартирный щит · 3 фазы'): PanelProject {
  const stamp = now()
  const rails: DinRail[] = [
    { id: 'rail-1', name: 'Ряд 1 — ввод и учёт', capacity: 16 },
    { id: 'rail-2', name: 'Ряд 2 — отходящие линии', capacity: 16 },
    { id: 'rail-3', name: 'Ряд 3 — шины и сервис', capacity: 16 },
  ]
  const components: PlacedComponent[] = [
    { uid: 'c-input', defId: 'disconnector-4p-63', dinRailId: 'rail-1', position: 0 },
    { uid: 'c-main', defId: 'main-breaker-4p-40', dinRailId: 'rail-1', position: 4, customName: 'Вводной автомат' },
    { uid: 'c-meter', defId: 'meter-3ph', dinRailId: 'rail-1', position: 8 },
    { uid: 'c-rcd', defId: 'rcd-4p-40-100', dinRailId: 'rail-1', position: 12, customName: 'Противопожарное УЗО' },
    { uid: 'c-qf-boiler', defId: 'br-3p-c-16', dinRailId: 'rail-2', position: 0, customName: 'Бойлер' },
    { uid: 'c-qf-ac', defId: 'br-3p-c-16', dinRailId: 'rail-2', position: 3, customName: 'Кондиционер' },
    { uid: 'c-qf-light', defId: 'br-1p-c-10', dinRailId: 'rail-2', position: 6, customName: 'Освещение' },
    { uid: 'c-qf-kitchen', defId: 'br-1p-c-16', dinRailId: 'rail-2', position: 7, customName: 'Розетки кухни' },
    { uid: 'c-qf-vent', defId: 'br-1p-c-6', dinRailId: 'rail-2', position: 8, customName: 'Вентиляция' },
    { uid: 'c-qf-bath', defId: 'rcbo-2p-c-16-30', dinRailId: 'rail-2', position: 9, customName: 'Розетки ванной' },
    { uid: 'c-relay', defId: 'relay-voltage-2p', dinRailId: 'rail-2', position: 11, customName: 'Реле напряжения' },
    { uid: 'c-timer', defId: 'relay-timer-2p', dinRailId: 'rail-2', position: 13, customName: 'Реле времени' },
    { uid: 'bus-n', defId: 'bus-n-8', dinRailId: 'rail-3', position: 0, customName: 'Шина N' },
    { uid: 'bus-pe', defId: 'bus-pe-8', dinRailId: 'rail-3', position: 4, customName: 'Шина PE' },
    { uid: 'bus-l', defId: 'bus-l-6', dinRailId: 'rail-3', position: 8, customName: 'Гребёнка L1' },
    { uid: 'c-indicator', defId: 'indicator-2p', dinRailId: 'rail-3', position: 11, customName: 'Индикатор сети' },
  ]

  const wires: Wire[] = []
  // Ввод → главный автомат
  for (const [index, kind, phase] of [
    [0, 'L1', 'L1'],
    [1, 'L2', 'L2'],
    [2, 'L3', 'L3'],
    [3, 'N', undefined],
  ] as const) {
    wires.push(
      wire(
        terminalUid('c-input', 'out', kind, index),
        terminalUid('c-main', 'in', kind, index),
        kind === 'N' ? 'neutral' : 'phase',
        10,
        phase,
      ),
    )
  }
  // Главный автомат → счётчик
  for (const [index, kind, phase] of [
    [0, 'L1', 'L1'],
    [1, 'L2', 'L2'],
    [2, 'L3', 'L3'],
    [3, 'N', undefined],
  ] as const) {
    wires.push(
      wire(
        terminalUid('c-main', 'out', kind, index),
        terminalUid('c-meter', 'in', kind, index),
        kind === 'N' ? 'neutral' : 'phase',
        10,
        phase,
      ),
    )
  }
  // Счётчик → УЗО
  for (const [index, kind, phase] of [
    [0, 'L1', 'L1'],
    [1, 'L2', 'L2'],
    [2, 'L3', 'L3'],
    [3, 'N', undefined],
  ] as const) {
    wires.push(
      wire(
        terminalUid('c-meter', 'out', kind, index),
        terminalUid('c-rcd', 'in', kind, index),
        kind === 'N' ? 'neutral' : 'phase',
        10,
        phase,
      ),
    )
  }
  wires.push(
    wire(
      terminalUid('c-rcd', 'out', 'L1', 0),
      terminalUid('bus-l', 'in', 'L1', 0),
      'phase',
      6,
      'L1',
    ),
    wire(terminalUid('c-rcd', 'out', 'N', 3), terminalUid('bus-n', 'in', 'N', 0), 'neutral', 10),
  )
  // Отходящие линии: трёхфазные нагрузки
  for (const [lineIndex, lineUid] of ['c-qf-boiler', 'c-qf-ac'].entries()) {
    wires.push(
      wire(
        terminalUid('bus-l', 'out', 'L1', lineIndex),
        terminalUid(lineUid, 'in', 'L1', 0),
        'phase',
        4,
        'L1',
      ),
      wire(
        terminalUid('c-rcd', 'out', 'L2', 1),
        terminalUid(lineUid, 'in', 'L2', 1),
        'phase',
        4,
        'L2',
      ),
      wire(
        terminalUid('c-rcd', 'out', 'L3', 2),
        terminalUid(lineUid, 'in', 'L3', 2),
        'phase',
        4,
        'L3',
      ),
    )
  }
  // Однофазные линии
  wires.push(
    wire(
      terminalUid('bus-l', 'out', 'L1', 2),
      terminalUid('c-qf-light', 'in', 'L1', 0),
      'phase',
      1.5,
      'L1',
    ),
    wire(
      terminalUid('c-rcd', 'out', 'L2', 1),
      terminalUid('c-qf-kitchen', 'in', 'L1', 0),
      'phase',
      2.5,
      'L2',
    ),
    wire(
      terminalUid('c-rcd', 'out', 'L3', 2),
      terminalUid('c-qf-vent', 'in', 'L1', 0),
      'phase',
      1.5,
      'L3',
    ),
    wire(
      terminalUid('bus-l', 'out', 'L1', 3),
      terminalUid('c-qf-bath', 'in', 'L1', 0),
      'phase',
      2.5,
      'L1',
    ),
    wire(
      terminalUid('bus-l', 'out', 'L1', 4),
      terminalUid('c-indicator', 'in', 'L1', 0),
      'phase',
      1.5,
      'L1',
    ),
    wire(
      terminalUid('bus-l', 'out', 'L1', 5),
      terminalUid('c-relay', 'in', 'L1', 0),
      'phase',
      1.5,
      'L1',
    ),
    wire(
      terminalUid('c-rcd', 'out', 'L1', 0),
      terminalUid('c-timer', 'in', 'L1', 0),
      'phase',
      1.5,
      'L1',
    ),
  )
  // Нейтраль и PE
  wires.push(
    wire(terminalUid('bus-n', 'out', 'N', 0), terminalUid('c-qf-bath', 'in', 'N', 1), 'neutral', 2.5),
    wire(terminalUid('bus-n', 'out', 'N', 1), terminalUid('c-indicator', 'in', 'N', 1), 'neutral', 1.5),
    wire(terminalUid('bus-n', 'out', 'N', 2), terminalUid('c-relay', 'in', 'N', 1), 'neutral', 1.5),
    wire(terminalUid('bus-n', 'out', 'N', 3), terminalUid('c-timer', 'in', 'N', 1), 'neutral', 1.5),
    wire(terminalUid('c-input', 'out', 'PE', 4), terminalUid('bus-pe', 'in', 'PE', 0), 'ground', 10),
  )

  const consumers: LoadConsumer[] = [
    {
      uid: 'load-boiler',
      name: 'Бойлер / проточный нагреватель',
      wireUidOrTerminalUid: terminalUid('c-qf-boiler', 'out', 'L1', 0),
      powerW: 9000,
      cosPhi: 0.98,
      utilization: 0.9,
      phase: 3,
      phaseLine: 'L1',
      loadType: 'reactive',
    },
    {
      uid: 'load-ac',
      name: 'Кондиционер',
      wireUidOrTerminalUid: terminalUid('c-qf-ac', 'out', 'L1', 0),
      powerW: 4500,
      cosPhi: 0.9,
      utilization: 0.8,
      phase: 3,
      phaseLine: 'L1',
      loadType: 'reactive',
    },
    {
      uid: 'load-light',
      name: 'Освещение',
      wireUidOrTerminalUid: terminalUid('c-qf-light', 'out', 'L1', 0),
      powerW: 1400,
      cosPhi: 0.95,
      utilization: 0.85,
      phase: 1,
      phaseLine: 'L1',
      loadType: 'active',
    },
    {
      uid: 'load-kitchen',
      name: 'Розетки кухни',
      wireUidOrTerminalUid: terminalUid('c-qf-kitchen', 'out', 'L1', 0),
      powerW: 2400,
      cosPhi: 0.95,
      utilization: 0.7,
      phase: 1,
      phaseLine: 'L2',
      loadType: 'reactive',
    },
    {
      uid: 'load-vent',
      name: 'Вентиляция',
      wireUidOrTerminalUid: terminalUid('c-qf-vent', 'out', 'L1', 0),
      powerW: 420,
      cosPhi: 0.85,
      utilization: 0.8,
      phase: 1,
      phaseLine: 'L3',
      loadType: 'reactive',
    },
    {
      uid: 'load-bath',
      name: 'Розетки ванной',
      wireUidOrTerminalUid: terminalUid('c-qf-bath', 'out', 'L1', 0),
      powerW: 2000,
      cosPhi: 0.98,
      utilization: 0.6,
      phase: 1,
      phaseLine: 'L3',
      loadType: 'reactive',
    },
  ]

  const circuit = (
    componentUid: string,
    cableSection: number,
    lengthM: number,
  ): CircuitConfig => ({
    componentUid,
    cableSection,
    material: 'copper',
    insulation: 'pvc',
    laying: 'conduit',
    lengthM,
    groupCount: 1,
    ambientC: 25,
  })
  const circuits: CircuitConfig[] = [
    circuit('c-qf-boiler', 2.5, 12),
    circuit('c-qf-ac', 2.5, 18),
    circuit('c-qf-light', 1.5, 22),
    circuit('c-qf-kitchen', 2.5, 16),
    circuit('c-qf-vent', 1.5, 20),
    circuit('c-qf-bath', 2.5, 14),
  ]

  return {
    id: createUid('project'),
    name,
    description:
      'Трёхфазный квартирный щит: ввод 40 А, учёт, противопожарное УЗО 100 мА и шесть групп потребителей.',
    version: 1,
    supply: { phase: 3, voltage: 400, mainBreaker: 40, mainBreakerCurve: 'C' },
    rails,
    components,
    wires,
    consumers,
    circuits,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export function duplicateProject(source: PanelProject, name?: string): PanelProject {
  const copy: PanelProject = JSON.parse(JSON.stringify(source)) as PanelProject
  copy.id = createUid('project')
  copy.name = name ?? `${source.name} — копия`
  copy.createdAt = now()
  copy.updatedAt = now()
  return copy
}
