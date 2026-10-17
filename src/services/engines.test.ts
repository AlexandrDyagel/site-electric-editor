import { describe, expect, it } from 'vitest'
import { createDemoProject, createEmptyProject } from '@/data/demo'
import { buildLayout, findFreeModule, findGroupMove, placeComponentOnRail, reorderOnRail, terminalUid } from '@/services/layoutEngine'
import { calculatePanel, currentFromPower } from '@/services/calcEngine'
import { validateConnection } from '@/services/validationEngine'
import { calculateAmpacity, selectCableSection } from '@/data/pue'
import { parseProjectJson, serializeProject } from '@/services/projectSerialization'

describe('layout engine', () => {
  it('раскладывает демо-проект без выхода за DIN-рейку', () => {
    const project = createDemoProject()
    const layout = buildLayout(project)
    expect(layout.components).toHaveLength(project.components.length)
    expect(layout.terminals.size).toBeGreaterThan(50)
    for (const rail of project.rails) {
      const used = project.components
        .filter((component) => component.dinRailId === rail.id)
        .reduce((sum, component) => sum + (layout.components.find((item) => item.placed.uid === component.uid)?.def.sizeModules ?? 0), 0)
      expect(used).toBeLessThanOrEqual(rail.capacity)
    }
    for (const component of layout.components) {
      expect(component.x).toBeGreaterThanOrEqual(0)
      expect(component.moduleEnd).toBeLessThanOrEqual(component.rail.capacity)
    }
  })

  it('сохраняет стабильные uid клемм', () => {
    const project = createDemoProject()
    const first = buildLayout(project)
    const second = buildLayout(project)
    expect([...first.terminals.keys()].sort()).toEqual([...second.terminals.keys()].sort())
    expect(first.terminals.has(terminalUid('c-qf-boiler', 'in', 'L2', 1))).toBe(true)
  })

  it('переставляет компонент без наложений', () => {
    const project = createDemoProject()
    const layoutBefore = buildLayout(project)
    const result = reorderOnRail(project, 'c-qf-light', 'rail-2', 1)
    expect(result.ok).toBe(true)
    project.components = result.components
    const layoutAfter = buildLayout(project)
    const positions = layoutAfter.components
      .filter((component) => component.rail.id === 'rail-2')
      .sort((a, b) => a.moduleStart - b.moduleStart)
    for (let i = 1; i < positions.length; i += 1) {
      const previous = positions[i - 1]
      const current = positions[i]
      if (previous && current) expect(current.moduleStart).toBeGreaterThanOrEqual(previous.moduleEnd)
    }
    expect(layoutBefore.components.length).toBe(layoutAfter.components.length)
  })

  it('ставит новое оборудование точно в точку drop на пустой рейке', () => {
    const project = createEmptyProject()
    const placed = {
      uid: 'new-four-pole',
      defId: 'br-4p-c-16',
      dinRailId: 'rail-2',
      position: 0,
    }
    const result = placeComponentOnRail(project, placed, 'rail-2', 6)
    expect(result.ok).toBe(true)
    expect(result.position).toBe(6)
    expect(result.snapped).toBe(false)
    const stored = result.components.find((item) => item.uid === placed.uid)
    expect(stored?.position).toBe(6)
  })

  it('сохраняет свободные модули и не сдвигает соседние аппараты', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'left', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 0 },
      { uid: 'right', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 10 },
    ]
    const placed = {
      uid: 'middle',
      defId: 'br-2p-c-16',
      dinRailId: 'rail-2',
      position: 0,
    }
    const result = placeComponentOnRail(project, placed, 'rail-2', 7)
    expect(result.ok).toBe(true)
    expect(result.position).toBe(7)
    expect(result.components.find((item) => item.uid === 'left')?.position).toBe(0)
    expect(result.components.find((item) => item.uid === 'right')?.position).toBe(10)
  })

  it('ищет ближайшее свободное окно, если точка занята', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'occupied', defId: 'br-4p-c-16', dinRailId: 'rail-3', position: 8 },
    ]
    expect(findFreeModule(project, 'rail-3', 8, 2)).toBe(6)
    const placed = {
      uid: 'new-two-pole',
      defId: 'br-2p-c-16',
      dinRailId: 'rail-3',
      position: 0,
    }
    const result = placeComponentOnRail(project, placed, 'rail-3', 8)
    expect(result.ok).toBe(true)
    expect(result.position).toBe(6)
    expect(result.snapped).toBe(true)
    expect(result.components.find((item) => item.uid === 'occupied')?.position).toBe(8)
  })

  it('позволяет перенести аппарат в свободное место, оставив прежний модуль пустым', () => {
    const project = createDemoProject()
    const before = project.components.find((item) => item.uid === 'c-indicator')?.position
    const result = reorderOnRail(project, 'c-indicator', 'rail-3', 13)
    expect(result.ok).toBe(true)
    expect(result.position).toBe(13)
    const stored = result.components.find((item) => item.uid === 'c-indicator')
    expect(stored?.position).toBe(13)
    expect(before).toBe(11)
    expect(result.components.find((item) => item.uid === 'bus-l')?.position).toBe(8)
  })

  it('перемещает группу аппаратов с сохранением взаимного расположения', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'group-a', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 0 },
      { uid: 'group-b', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 2 },
    ]
    const plan = findGroupMove(project, ['group-a', 'group-b'], 4, 0)
    expect(plan).not.toBeNull()
    expect(plan?.deltaModules).toBe(4)
    expect(plan?.positions.get('group-a')).toEqual({ railId: 'rail-2', position: 4 })
    expect(plan?.positions.get('group-b')).toEqual({ railId: 'rail-2', position: 6 })
  })

  it('ищет свободное положение для группы и не ставит её на чужой аппарат', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'group-a', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 0 },
      { uid: 'group-b', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 2 },
      { uid: 'blocker', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 4 },
    ]
    const plan = findGroupMove(project, ['group-a', 'group-b'], 4, 0)
    expect(plan).not.toBeNull()
    const placements = [
      ...project.components
        .filter((component) => !['group-a', 'group-b'].includes(component.uid))
        .map((component) => ({ start: component.position, end: component.position + 2 })),
      ...[...plan!.positions.values()].map((target) => ({
        start: target.position,
        end: target.position + 2,
      })),
    ].sort((a, b) => a.start - b.start)
    for (let index = 1; index < placements.length; index += 1) {
      expect(placements[index]!.start).toBeGreaterThanOrEqual(placements[index - 1]!.end)
    }
  })

  it('переносит группу на соседние рейки', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'group-a', defId: 'br-2p-c-16', dinRailId: 'rail-2', position: 0 },
      { uid: 'group-b', defId: 'br-2p-c-16', dinRailId: 'rail-3', position: 0 },
    ]
    const plan = findGroupMove(project, ['group-a', 'group-b'], 0, -1)
    expect(plan).not.toBeNull()
    expect(plan?.positions.get('group-a')).toEqual({ railId: 'rail-1', position: 0 })
    expect(plan?.positions.get('group-b')).toEqual({ railId: 'rail-2', position: 0 })
    expect(findGroupMove(project, ['group-a', 'group-b'], 0, 5)).toBeNull()
  })

  it('меняет местами одинаковые аппараты при drop друг на друга', () => {
    const project = createDemoProject()
    const result = reorderOnRail(project, 'c-qf-light', 'rail-2', 7)
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('swap')
    expect(result.components.find((item) => item.uid === 'c-qf-light')?.position).toBe(7)
    expect(result.components.find((item) => item.uid === 'c-qf-kitchen')?.position).toBe(6)
  })

  it('меняет местами аппараты разной ширины, сдвигая соседний модуль', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'four', defId: 'br-4p-c-16', dinRailId: 'rail-2', position: 0 },
      { uid: 'three', defId: 'br-3p-c-16', dinRailId: 'rail-2', position: 4 },
      { uid: 'single', defId: 'br-1p-c-16', dinRailId: 'rail-2', position: 7 },
    ]
    const result = reorderOnRail(project, 'four', 'rail-2', 4)
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('swap')
    expect(result.components.find((item) => item.uid === 'three')?.position).toBe(0)
    expect(result.components.find((item) => item.uid === 'four')?.position).toBe(3)
    expect(result.components.find((item) => item.uid === 'single')?.position).toBe(7)
  })

  it('меняет порядок при конфликте с соседними модулями', () => {
    const project = createEmptyProject()
    project.components = [
      { uid: 'wide', defId: 'br-4p-c-16', dinRailId: 'rail-2', position: 0 },
      { uid: 'small', defId: 'br-1p-c-16', dinRailId: 'rail-2', position: 5 },
      { uid: 'neighbor', defId: 'br-1p-c-16', dinRailId: 'rail-2', position: 6 },
    ]
    const result = reorderOnRail(project, 'small', 'rail-2', 0)
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('swap')
    const positions = result.components
      .filter((item) => item.dinRailId === 'rail-2')
      .map((item) => ({ uid: item.uid, start: item.position, end: item.position + (item.uid === 'wide' ? 4 : 1) }))
      .sort((a, b) => a.start - b.start)
    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1]
      const current = positions[index]
      if (previous && current) expect(current.start).toBeGreaterThanOrEqual(previous.end)
    }
  })
})

describe('calculation engine', () => {
  it('считает ток, мощности и перекос фаз демо-проекта', () => {
    const project = createDemoProject()
    const layout = buildLayout(project)
    const result = calculatePanel(project, layout)
    expect(result.lines).toHaveLength(6)
    expect(result.totalInstalledPowerW).toBe(19720)
    expect(result.totalCurrentA).toBeGreaterThan(20)
    expect(result.totalCurrentA).toBeLessThan(30)
    expect(result.phases).toHaveLength(3)
    expect(result.rcds).toHaveLength(2)
    const mainRcd = result.rcds.find((rcd) => rcd.componentUid === 'c-rcd')
    expect(mainRcd?.requiredResidualMa).toBeGreaterThan(0)
    expect(mainRcd?.ratedResidualMa).toBe(100)
    expect(result.issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(result.imbalanceStatus).not.toBe('error')
  })

  it('определяет перегрузку автомата', () => {
    const project = createDemoProject()
    const consumer = project.consumers.find((item) => item.uid === 'load-light')
    if (!consumer) throw new Error('consumer not found')
    consumer.powerW = 5000
    const result = calculatePanel(project, buildLayout(project))
    const line = result.lines.find((item) => item.name === 'Освещение')
    expect(line?.status).toBe('error')
    expect(line?.issues.some((issue) => issue.code === 'BREAKER_OVERLOAD')).toBe(true)
  })

  it('считает ток по мощности для 1 и 3 фаз', () => {
    expect(currentFromPower(2300, 1, 1, 1, 230)).toBeCloseTo(10, 4)
    expect(currentFromPower(6900, 1, 3, 3, 400)).toBeCloseTo(9.96, 1)
  })
})

describe('connection validation', () => {
  it('запрещает прямое соединение фазы и нейтрали', () => {
    const project = createDemoProject()
    const layout = buildLayout(project)
    const validation = validateConnection(project, layout, 'c-rcd:out:L1:0', 'bus-n:in:N:0')
    expect(validation.valid).toBe(false)
    expect(validation.code).toBe('PHASE_NEUTRAL')
  })

  it('запрещает объединение N и PE', () => {
    const project = createDemoProject()
    const layout = buildLayout(project)
    const validation = validateConnection(project, layout, 'bus-n:out:N:7', 'bus-pe:out:PE:7')
    expect(validation.valid).toBe(false)
    expect(validation.code).toBe('NP_TIE')
  })

  it('разрешает подачу другой фазы на однополюсный автомат', () => {
    const project = createDemoProject()
    const layout = buildLayout(project)
    const validation = validateConnection(project, layout, 'c-rcd:out:L2:1', 'c-qf-bath:in:L1:0')
    expect(validation.valid).toBe(true)
  })
})

describe('ПУЭ', () => {
  it('применяет поправочные коэффициенты и подбирает сечение', () => {
    const ampacity = calculateAmpacity(2.5, {
      material: 'copper',
      insulation: 'pvc',
      laying: 'conduit',
      ambientC: 25,
      groupCount: 1,
      designCurrentA: 16,
    })
    expect(ampacity.ampacity).toBeCloseTo(26.63, 1)
    const section = selectCableSection(30, {
      material: 'copper',
      insulation: 'pvc',
      laying: 'conduit',
      ambientC: 25,
      groupCount: 1,
    })
    expect(section?.section).toBe(4)
  })
})

describe('импорт и экспорт проекта', () => {
  it('совершает round-trip JSON без потери данных', () => {
    const project = createDemoProject()
    const parsed = parseProjectJson(JSON.parse(serializeProject(project)))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.project.name).toBe(project.name)
    expect(parsed.project.components).toHaveLength(project.components.length)
    expect(parsed.project.wires).toHaveLength(project.wires.length)
    expect(parsed.project.consumers).toHaveLength(project.consumers.length)
  })

  it('отклоняет повреждённую структуру', () => {
    const parsed = parseProjectJson({ name: 'Без реек', components: [], wires: [] })
    expect(parsed.ok).toBe(false)
  })
})
