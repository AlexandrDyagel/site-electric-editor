import type {
  CalculationIssue,
  CalculationResult,
  CircuitConfig,
  ComponentDef,
  LayoutComponent,
  LineCalculation,
  LoadConsumer,
  PanelLayout,
  PanelProject,
  PhaseCalculation,
  PhaseTag,
  RcdCalculation,
  SelectivityCheck,
  Severity,
  TripCurve,
} from '@/types'
import { calculateAmpacity, selectCableSection, voltageDropPct } from '@/data/pue'
import {
  buildWiringGraph,
  findUpstreamComponents,
  isRcd,
  validateProject,
} from '@/services/validationEngine'

const PHASES: PhaseTag[] = ['L1', 'L2', 'L3']

export function phaseVoltage(project: PanelProject): number {
  return project.supply.phase === 3 ? project.supply.voltage / Math.sqrt(3) : project.supply.voltage
}

export function currentFromPower(
  powerW: number,
  cosPhi: number,
  phase: 1 | 3,
  supplyPhase: 1 | 3,
  voltage: number,
): number {
  const safeCos = Math.max(0.1, cosPhi)
  if (phase === 3) {
    return powerW / (Math.sqrt(3) * voltage * safeCos)
  }
  const u = supplyPhase === 3 ? voltage / Math.sqrt(3) : voltage
  return powerW / (u * safeCos)
}

export function severityRank(severity: Severity): number {
  if (severity === 'error') return 2
  if (severity === 'warning') return 1
  return 0
}

export function maxSeverity(items: Severity[]): Severity {
  return items.reduce<Severity>(
    (current, item) => (severityRank(item) > severityRank(current) ? item : current),
    'ok',
  )
}

export function defaultCircuit(componentUid: string, ratedCurrent: number): CircuitConfig {
  const section = selectCableSection(ratedCurrent, {
    material: 'copper',
    insulation: 'pvc',
    laying: 'conduit',
    ambientC: 25,
    groupCount: 1,
  })
  const fallback =
    ratedCurrent <= 16 ? 2.5 : ratedCurrent <= 25 ? 4 : ratedCurrent <= 32 ? 6 : 10
  return {
    componentUid,
    cableSection: section?.section ?? fallback,
    material: 'copper',
    insulation: 'pvc',
    laying: 'conduit',
    lengthM: 18,
    groupCount: 1,
    ambientC: 25,
  }
}

interface ResolvedConsumer {
  consumer: LoadConsumer
  terminalComponentUid: string
  lineUid: string
  line: LayoutComponent
  currentA: number
}

function resolveLineForConsumer(
  consumer: LoadConsumer,
  project: PanelProject,
  layout: PanelLayout,
): { line: LayoutComponent | undefined; terminalComponentUid: string } {
  const graph = buildWiringGraph(project, layout)
  let terminal = graph.terminals.get(consumer.wireUidOrTerminalUid)
  if (!terminal) {
    const wire = project.wires.find((item) => item.uid === consumer.wireUidOrTerminalUid)
    if (wire) terminal = graph.terminals.get(wire.to) ?? graph.terminals.get(wire.from)
  }
  if (!terminal) return { line: undefined, terminalComponentUid: '' }
  const direct = layout.components.find((component) => component.placed.uid === terminal?.componentUid)
  if (direct?.def.protective) return { line: direct, terminalComponentUid: terminal.componentUid }
  const upstream = findUpstreamComponents(project, layout, terminal.componentUid)
  const candidates = layout.components
    .filter((component) => upstream.has(component.placed.uid) && component.def.protective)
    .sort((a, b) => (b.def.ratedCurrent ?? 0) - (a.def.ratedCurrent ?? 0))
  return {
    line: candidates[0] ?? direct,
    terminalComponentUid: terminal.componentUid,
  }
}

function resolveAllConsumers(
  project: PanelProject,
  layout: PanelLayout,
): { items: ResolvedConsumer[]; byLine: Map<string, ResolvedConsumer[]> } {
  const items: ResolvedConsumer[] = []
  const byLine = new Map<string, ResolvedConsumer[]>()
  for (const consumer of project.consumers) {
    const { line } = resolveLineForConsumer(consumer, project, layout)
    if (!line) continue
    const currentA = currentFromPower(
      consumer.powerW * consumer.utilization,
      consumer.cosPhi,
      consumer.phase,
      project.supply.phase,
      project.supply.voltage,
    )
    const item: ResolvedConsumer = {
      consumer,
      terminalComponentUid: line.placed.uid,
      lineUid: line.placed.uid,
      line,
      currentA,
    }
    items.push(item)
    const list = byLine.get(line.placed.uid) ?? []
    list.push(item)
    byLine.set(line.placed.uid, list)
  }
  return { items, byLine }
}

function circuitForLine(
  project: PanelProject,
  line: LayoutComponent,
): CircuitConfig {
  return (
    project.circuits.find((item) => item.componentUid === line.placed.uid) ??
    defaultCircuit(line.placed.uid, line.def.ratedCurrent ?? 16)
  )
}

function curveRank(curve: TripCurve | undefined): number {
  if (curve === 'D') return 3
  if (curve === 'C') return 2
  return 1
}

function buildLineCalculation(
  project: PanelProject,
  line: LayoutComponent,
  consumers: ResolvedConsumer[],
): LineCalculation {
  const issues: CalculationIssue[] = []
  const ratedCurrent = line.def.ratedCurrent ?? 0
  const connectedPowerW = consumers.reduce((sum, item) => sum + item.consumer.powerW, 0)
  const calculatedPowerW = consumers.reduce(
    (sum, item) => sum + item.consumer.powerW * item.consumer.utilization,
    0,
  )
  const currentA = consumers.reduce((sum, item) => sum + item.currentA, 0)
  const apparent = consumers.reduce(
    (sum, item) => sum + (item.consumer.powerW * item.consumer.utilization) / item.consumer.cosPhi,
    0,
  )
  const cosPhi = apparent > 0 ? Number((calculatedPowerW / apparent).toFixed(3)) : 1
  const phaseLines = new Set(consumers.filter((item) => item.consumer.phase === 1).map((item) => item.consumer.phaseLine))
  const phaseLine = phaseLines.size === 1 ? [...phaseLines][0] : undefined
  const circuit = circuitForLine(project, line)
  const ampacityResult = calculateAmpacity(circuit.cableSection, {
    material: circuit.material,
    insulation: circuit.insulation,
    laying: circuit.laying,
    ambientC: circuit.ambientC,
    groupCount: circuit.groupCount,
    designCurrentA: currentA,
  })
  const drop = voltageDropPct({
    currentA,
    lengthM: circuit.lengthM,
    section: circuit.cableSection,
    material: circuit.material,
    phase: project.supply.phase,
    cosPhi,
    voltage: project.supply.voltage,
  })
  const displayName = line.placed.customName ?? line.def.name

  if (ratedCurrent <= 0) {
    issues.push({
      code: 'NO_RATING',
      severity: 'error',
      title: 'Не задан номинал',
      message: `У аппарата «${displayName}» отсутствует номинальный ток`,
      componentUid: line.placed.uid,
    })
  } else if (currentA > ratedCurrent) {
    issues.push({
      code: 'BREAKER_OVERLOAD',
      severity: 'error',
      title: 'Перегрузка автомата',
      message: `Расчётный ток ${currentA.toFixed(1)} А превышает номинал ${ratedCurrent} А`,
      componentUid: line.placed.uid,
    })
  } else if (ratedCurrent / Math.max(currentA, 0.001) < 1.1) {
    issues.push({
      code: 'LOW_MARGIN',
      severity: 'warning',
      title: 'Малый запас автомата',
      message: `Запас по току менее 10%: ${currentA.toFixed(1)} А при номинале ${ratedCurrent} А`,
      componentUid: line.placed.uid,
    })
  }

  if (currentA > ampacityResult.ampacity) {
    issues.push({
      code: 'CABLE_OVERLOAD',
      severity: 'error',
      title: 'Перегрузка кабеля',
      message: `Ток ${currentA.toFixed(1)} А выше допустимого ${ampacityResult.ampacity.toFixed(1)} А для ${circuit.cableSection} мм²`,
      componentUid: line.placed.uid,
    })
  }
  if (ratedCurrent > ampacityResult.ampacity) {
    issues.push({
      code: 'CABLE_UNPROTECTED',
      severity: 'error',
      title: 'Кабель не защищён',
      message: `Номинал ${ratedCurrent} А выше допустимого тока кабеля ${ampacityResult.ampacity.toFixed(1)} А`,
      componentUid: line.placed.uid,
    })
  }
  if (drop > 5) {
    issues.push({
      code: 'VOLTAGE_DROP',
      severity: 'error',
      title: 'Недопустимое падение напряжения',
      message: `ΔU = ${drop.toFixed(2)}% при длине ${circuit.lengthM} м — больше 5%`,
      componentUid: line.placed.uid,
    })
  } else if (drop > 3) {
    issues.push({
      code: 'VOLTAGE_DROP_WARN',
      severity: 'warning',
      title: 'Повышенное падение напряжения',
      message: `ΔU = ${drop.toFixed(2)}% — рекомендуется увеличить сечение или сократить линию`,
      componentUid: line.placed.uid,
    })
  }

  return {
    componentUid: line.placed.uid,
    name: displayName,
    ratedCurrent,
    tripCurve: line.def.tripCurve,
    connectedPowerW,
    calculatedPowerW,
    currentA,
    cosPhi,
    phase: consumers.some((item) => item.consumer.phase === 3) ? 3 : 1,
    phaseLine,
    cableSection: circuit.cableSection,
    ampacity: ampacityResult.ampacity,
    voltageDropPct: drop,
    status: maxSeverity(issues.map((issue) => issue.severity)),
    issues,
    consumerCount: consumers.length,
  }
}

function buildPhaseCalculations(
  project: PanelProject,
  consumers: ResolvedConsumer[],
): { phases: PhaseCalculation[]; imbalancePct: number; status: Severity } {
  if (project.supply.phase === 1) {
    const powerW = consumers.reduce(
      (sum, item) => sum + item.consumer.powerW * item.consumer.utilization,
      0,
    )
    const currentA = consumers.reduce((sum, item) => sum + item.currentA, 0)
    return {
      phases: [{ phase: 'L1', powerW, currentA, sharePct: 100 }],
      imbalancePct: 0,
      status: 'ok',
    }
  }
  const power: Record<PhaseTag, number> = { L1: 0, L2: 0, L3: 0 }
  const current: Record<PhaseTag, number> = { L1: 0, L2: 0, L3: 0 }
  for (const item of consumers) {
    const consumerPower = item.consumer.powerW * item.consumer.utilization
    if (item.consumer.phase === 3) {
      for (const phase of PHASES) {
        power[phase] += consumerPower / 3
        current[phase] += item.currentA / 3
      }
    } else {
      power[item.consumer.phaseLine] += consumerPower
      current[item.consumer.phaseLine] += item.currentA
    }
  }
  const totalPower = PHASES.reduce((sum, phase) => sum + power[phase], 0)
  const currentValues = PHASES.map((phase) => current[phase])
  const average = currentValues.reduce((sum, value) => sum + value, 0) / 3
  const maxDeviation = Math.max(...currentValues.map((value) => Math.abs(value - average)))
  const imbalancePct = average > 0 ? Number(((maxDeviation / average) * 100).toFixed(1)) : 0
  const status: Severity = imbalancePct > 25 ? 'error' : imbalancePct > 15 ? 'warning' : 'ok'
  return {
    phases: PHASES.map((phase) => ({
      phase,
      powerW: power[phase],
      currentA: current[phase],
      sharePct: totalPower > 0 ? Number(((power[phase] / totalPower) * 100).toFixed(1)) : 0,
    })),
    imbalancePct,
    status,
  }
}

function buildRcdCalculations(
  layout: PanelLayout,
  lines: LineCalculation[],
  consumersByLine: Map<string, ResolvedConsumer[]>,
  upstreamCache: Map<string, Set<string>>,
): RcdCalculation[] {
  const result: RcdCalculation[] = []
  const rcds = layout.components.filter((component) => isRcd(component.def))
  for (const rcd of rcds) {
    const downstreamLines = lines.filter((line) => {
      if (line.componentUid === rcd.placed.uid) return true
      const upstream = upstreamCache.get(line.componentUid)
      return upstream?.has(rcd.placed.uid) ?? false
    })
    const leakageMa = downstreamLines.reduce((sum, line) => {
      const count = consumersByLine.get(line.componentUid)?.length ?? 0
      return sum + line.currentA * 0.4 + count * 0.5
    }, 0)
    const required = Number((leakageMa * 3).toFixed(1))
    const rated = rcd.def.residualCurrent ?? 0
    const issues: CalculationIssue[] = []
    if (rated <= 0) {
      issues.push({
        code: 'RCD_NO_RATING',
        severity: 'error',
        title: 'Не задана уставка УЗО',
        message: 'У дифференциальной защиты отсутствует ток утечки',
        componentUid: rcd.placed.uid,
      })
    } else if (downstreamLines.length > 0 && rated < required) {
      issues.push({
        code: 'RCD_INSUFFICIENT',
        severity: 'error',
        title: 'Недостаточная уставка УЗО',
        message: `Расчётная утечка ${leakageMa.toFixed(1)} мА требует уставку не менее ${required.toFixed(1)} мА (правило 3×), установлено ${rated} мА`,
        componentUid: rcd.placed.uid,
      })
    } else if (downstreamLines.length > 0 && rated < required * 1.25) {
      issues.push({
        code: 'RCD_MARGIN',
        severity: 'warning',
        title: 'Малый запас УЗО',
        message: `Уставка ${rated} мА близка к минимально допустимой ${required.toFixed(1)} мА`,
        componentUid: rcd.placed.uid,
      })
    }
    if (downstreamLines.length === 0) {
      issues.push({
        code: 'RCD_NO_LOAD',
        severity: 'warning',
        title: 'УЗО без нагрузки',
        message: `За «${rcd.placed.customName ?? rcd.def.name}» не закреплено ни одной линии`,
        componentUid: rcd.placed.uid,
      })
    }
    result.push({
      componentUid: rcd.placed.uid,
      name: rcd.placed.customName ?? rcd.def.name,
      ratedResidualMa: rated,
      leakageMa: Number(leakageMa.toFixed(1)),
      requiredResidualMa: required,
      circuits: downstreamLines.length,
      status: maxSeverity(issues.map((issue) => issue.severity)),
      issues,
    })
  }
  return result
}

function findUpstreamProtective(
  project: PanelProject,
  layout: PanelLayout,
  line: LayoutComponent,
  upstreamIds: Set<string>,
): { def: ComponentDef; uid: string } | null {
  const candidates = layout.components
    .filter(
      (component) =>
        upstreamIds.has(component.placed.uid) &&
        component.def.protective &&
        (component.def.ratedCurrent ?? 0) > 0,
    )
    .sort((a, b) => (a.def.ratedCurrent ?? 0) - (b.def.ratedCurrent ?? 0))
  const downstreamRating = line.def.ratedCurrent ?? 0
  const higher = candidates.find((component) => (component.def.ratedCurrent ?? 0) >= downstreamRating)
  const chosen = higher ?? candidates[candidates.length - 1]
  if (chosen) return { def: chosen.def, uid: chosen.placed.uid }
  if (project.supply.mainBreaker) {
    return {
      def: {
        id: 'virtual-main',
        name: `Вводной автомат ${project.supply.mainBreaker} А`,
        shortName: 'QF ввод',
        category: 'input',
        brand: '—',
        series: '—',
        poles: project.supply.phase === 3 ? 4 : 2,
        ratedCurrent: project.supply.mainBreaker,
        tripCurve: project.supply.mainBreakerCurve ?? 'C',
        terminals: [],
        price: 0,
        sizeModules: project.supply.phase === 3 ? 4 : 2,
        description: '',
        protective: true,
      },
      uid: 'virtual-main',
    }
  }
  return null
}

function buildSelectivity(
  project: PanelProject,
  layout: PanelLayout,
  lines: LineCalculation[],
  upstreamCache: Map<string, Set<string>>,
): SelectivityCheck[] {
  const checks: SelectivityCheck[] = []
  for (const line of lines) {
    const component = layout.components.find((item) => item.placed.uid === line.componentUid)
    const upstreamIds = upstreamCache.get(line.componentUid)
    if (!component || !upstreamIds) continue
    const upstream = findUpstreamProtective(project, layout, component, upstreamIds)
    if (!upstream || !upstream.def.ratedCurrent) continue
    const upstreamRating = upstream.def.ratedCurrent
    const downstreamRating = line.ratedCurrent
    const ratio = downstreamRating > 0 ? upstreamRating / downstreamRating : 0
    let status: Severity = 'ok'
    let message = `Соотношение ${upstreamRating} А / ${downstreamRating} А = ${ratio.toFixed(2)} — селективность обеспечена`
    if (downstreamRating >= upstreamRating) {
      status = 'error'
      message = `Нижестоящий автомат ${downstreamRating} А не меньше вышестоящего ${upstreamRating} А`
    } else if (ratio < 1.6) {
      status = 'warning'
      message = `Запас селективности ${ratio.toFixed(2)} меньше рекомендуемых 1,6`
    }
    const downstreamCurve = line.tripCurve ?? 'C'
    const upstreamCurve = upstream.def.tripCurve ?? 'C'
    if (
      status !== 'error' &&
      curveRank(downstreamCurve) > curveRank(upstreamCurve) &&
      upstream.def.id !== 'virtual-main'
    ) {
      status = 'warning'
      message += `; кривые ${downstreamCurve}→${upstreamCurve} требуют проверки по время-токовым характеристикам`
    }
    checks.push({
      downstreamUid: line.componentUid,
      upstreamUid: upstream.uid,
      downstreamName: line.name,
      upstreamName: upstream.def.name,
      downstreamRating,
      upstreamRating,
      ratio: Number(ratio.toFixed(2)),
      status,
      message,
    })
  }
  return checks
}

/**
 * Главный расчётный движок. Не зависит от Vue и DOM.
 * Все токи — расчётные, с коэффициентом использования и cosφ.
 */
export function calculatePanel(project: PanelProject, layout: PanelLayout): CalculationResult {
  const { items, byLine } = resolveAllConsumers(project, layout)
  const upstreamCache = new Map<string, Set<string>>()
  for (const component of layout.components) {
    upstreamCache.set(component.placed.uid, findUpstreamComponents(project, layout, component.placed.uid))
  }
  const lines: LineCalculation[] = []
  for (const [lineUid, consumers] of byLine) {
    const line = layout.components.find((component) => component.placed.uid === lineUid)
    if (!line) continue
    lines.push(buildLineCalculation(project, line, consumers))
  }
  lines.sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const totalInstalledPowerW = project.consumers.reduce((sum, item) => sum + item.powerW, 0)
  const totalCalculatedPowerW = items.reduce(
    (sum, item) => sum + item.consumer.powerW * item.consumer.utilization,
    0,
  )
  const totalApparentPowerVa = items.reduce(
    (sum, item) =>
      sum + (item.consumer.powerW * item.consumer.utilization) / Math.max(item.consumer.cosPhi, 0.1),
    0,
  )
  const totalCurrentA =
    project.supply.phase === 3
      ? totalApparentPowerVa / (Math.sqrt(3) * project.supply.voltage)
      : totalApparentPowerVa / project.supply.voltage
  const averageCosPhi =
    totalApparentPowerVa > 0 ? Number((totalCalculatedPowerW / totalApparentPowerVa).toFixed(3)) : 1
  const phaseResult = buildPhaseCalculations(project, items)
  const rcds = buildRcdCalculations(layout, lines, byLine, upstreamCache)
  const selectivity = buildSelectivity(project, layout, lines, upstreamCache)
  const issues: CalculationIssue[] = [...validateProject(project, layout)]
  for (const line of lines) issues.push(...line.issues)
  for (const rcd of rcds) issues.push(...rcd.issues)
  for (const check of selectivity) {
    if (check.status === 'ok') continue
    issues.push({
      code: 'SELECTIVITY',
      severity: check.status,
      title: check.status === 'error' ? 'Нарушена селективность' : 'Селективность под вопросом',
      message: `${check.downstreamName} → ${check.upstreamName}: ${check.message}`,
      componentUid: check.downstreamUid,
    })
  }
  if (phaseResult.status !== 'ok') {
    issues.push({
      code: 'PHASE_IMBALANCE',
      severity: phaseResult.status,
      title: 'Перекос фаз',
      message: `Неравномерность токов по фазам ${phaseResult.imbalancePct.toFixed(1)}%`,
    })
  }
  let mainBreakerStatus: Severity = 'ok'
  let mainBreakerUtilizationPct: number | undefined
  if (project.supply.mainBreaker) {
    mainBreakerUtilizationPct = Number(
      ((totalCurrentA / project.supply.mainBreaker) * 100).toFixed(1),
    )
    if (mainBreakerUtilizationPct > 100) {
      mainBreakerStatus = 'error'
      issues.push({
        code: 'MAIN_OVERLOAD',
        severity: 'error',
        title: 'Перегрузка вводного автомата',
        message: `Ток щита ${totalCurrentA.toFixed(1)} А превышает вводной номинал ${project.supply.mainBreaker} А`,
      })
    } else if (mainBreakerUtilizationPct > 90) {
      mainBreakerStatus = 'warning'
      issues.push({
        code: 'MAIN_MARGIN',
        severity: 'warning',
        title: 'Малый запас ввода',
        message: `Вводной автомат загружен на ${mainBreakerUtilizationPct.toFixed(1)}%`,
      })
    }
  } else {
    mainBreakerStatus = 'warning'
  }
  const status = maxSeverity([
    ...issues.map((issue) => issue.severity),
    ...lines.map((line) => line.status),
    ...rcds.map((rcd) => rcd.status),
    mainBreakerStatus,
  ])
  return {
    totalInstalledPowerW,
    totalCalculatedPowerW,
    totalApparentPowerVa,
    totalCurrentA,
    averageCosPhi,
    phases: phaseResult.phases,
    imbalancePct: phaseResult.imbalancePct,
    imbalanceStatus: phaseResult.status,
    lines,
    rcds,
    selectivity,
    issues,
    mainBreaker: project.supply.mainBreaker,
    mainBreakerUtilizationPct,
    mainBreakerStatus,
    status,
  }
}
