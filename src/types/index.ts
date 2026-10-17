/**
 * Базовые доменные типы проекта.
 * Все сущности сериализуемы в JSON и не зависят от Vue/Konva/DOM.
 */

export type PoleCount = 1 | 2 | 3 | 4

export type TerminalKind = 'L1' | 'L2' | 'L3' | 'N' | 'PE'
export type TerminalSide = 'in' | 'out'

export type WireKind = 'phase' | 'neutral' | 'ground' | 'jumper'
export type PhaseTag = 'L1' | 'L2' | 'L3'
export type TripCurve = 'B' | 'C' | 'D'

export type ComponentCategory =
  | 'breakers'
  | 'rcd'
  | 'rcbo'
  | 'protection'
  | 'metering'
  | 'buses'
  | 'accessories'
  | 'input'

export type LoadType = 'active' | 'reactive'
export type CableMaterial = 'copper' | 'aluminum'
export type CableInsulation = 'pvc' | 'xlpe'
export type LayingMethod = 'conduit' | 'air' | 'ground'
export type Severity = 'ok' | 'warning' | 'error'

export interface TerminalDef {
  kind: TerminalKind
  side: TerminalSide
  /** Порядковый номер клеммы внутри стороны. */
  index: number
  label?: string
}

/** Описание каталожного типа оборудования. */
export interface ComponentDef {
  id: string
  name: string
  shortName: string
  category: ComponentCategory
  brand: string
  series: string
  poles: PoleCount
  ratedCurrent?: number
  residualCurrent?: number
  tripCurve?: TripCurve
  terminals: TerminalDef[]
  price: number
  /** Ширина в модулях DIN (1 модуль = 17,5 мм). */
  sizeModules: number
  description: string
  breakingCapacity?: number
  /** Можно ли использовать как защитную линию для потребителя. */
  protective?: boolean
}

/** Экземпляр оборудования, установленный на рейку. */
export interface PlacedComponent {
  uid: string
  defId: string
  dinRailId: string
  /** Позиция в модулях от левого края рейки. */
  position: number
  /** Пользовательская подпись линии. */
  customName?: string
}

export interface DinRail {
  id: string
  name: string
  /** Ёмкость рейки в модулях. */
  capacity: number
}

export interface Terminal {
  uid: string
  componentUid: string
  defId: string
  kind: TerminalKind
  side: TerminalSide
  label: string
  coords: { x: number; y: number }
}

export interface Wire {
  uid: string
  from: string
  to: string
  kind: WireKind
  phase?: PhaseTag
  crossSection: number
  color?: string
}

/**
 * Потребитель привязан к выходной клемме защитного аппарата.
 * Поле wireUidOrTerminalUid хранит uid клеммы (или провода) для совместимости с ТЗ.
 */
export interface LoadConsumer {
  uid: string
  name: string
  wireUidOrTerminalUid: string
  powerW: number
  cosPhi: number
  utilization: number
  /** 1 — однофазный, 3 — трёхфазный. */
  phase: 1 | 3
  /** Для однофазного потребителя — к какой фазе подключён. */
  phaseLine: PhaseTag
  loadType: LoadType
}

export interface CircuitConfig {
  componentUid: string
  cableSection: number
  material: CableMaterial
  insulation: CableInsulation
  laying: LayingMethod
  lengthM: number
  groupCount: number
  ambientC: number
}

export interface PanelSupply {
  phase: 1 | 3
  /** Линейное напряжение: 230 В для однофазной, 400 В для трёхфазной сети. */
  voltage: number
  mainBreaker?: number
  mainBreakerCurve?: TripCurve
}

export interface PanelProject {
  id: string
  name: string
  description: string
  version: 1
  supply: PanelSupply
  rails: DinRail[]
  components: PlacedComponent[]
  wires: Wire[]
  consumers: LoadConsumer[]
  circuits: CircuitConfig[]
  createdAt: string
  updatedAt: string
}

/** Клемма с вычисленными координатами на холсте. */
export interface LayoutTerminal extends Terminal {
  x: number
  y: number
}

/** Рейка с вычисленной геометрией. */
export interface LayoutRail extends DinRail {
  index: number
  y: number
  x: number
  width: number
  height: number
}

/** Размещённый компонент с геометрией. */
export interface LayoutComponent {
  placed: PlacedComponent
  def: ComponentDef
  rail: LayoutRail
  x: number
  y: number
  width: number
  height: number
  terminals: LayoutTerminal[]
  moduleStart: number
  moduleEnd: number
}

export interface PanelLayout {
  components: LayoutComponent[]
  terminals: Map<string, LayoutTerminal>
  rails: LayoutRail[]
  width: number
  height: number
}

export interface AmpacityRow {
  section: number
  copperPvc: number
  copperXlpe: number
  aluminumPvc: number
  aluminumXlpe: number
}

export interface AmpacityResult {
  section: number
  baseAmpacity: number
  temperatureFactor: number
  groupingFactor: number
  layingFactor: number
  ampacity: number
  utilizationPct: number
}

export interface LineCalculation {
  componentUid: string
  name: string
  ratedCurrent: number
  tripCurve?: TripCurve
  connectedPowerW: number
  calculatedPowerW: number
  currentA: number
  cosPhi: number
  phase: 1 | 3
  phaseLine?: PhaseTag
  cableSection?: number
  ampacity?: number
  voltageDropPct?: number
  status: Severity
  issues: CalculationIssue[]
  consumerCount: number
}

export interface PhaseCalculation {
  phase: PhaseTag
  powerW: number
  currentA: number
  sharePct: number
}

export interface RcdCalculation {
  componentUid: string
  name: string
  ratedResidualMa: number
  leakageMa: number
  requiredResidualMa: number
  circuits: number
  status: Severity
  issues: CalculationIssue[]
}

export interface SelectivityCheck {
  downstreamUid: string
  upstreamUid: string
  downstreamName: string
  upstreamName: string
  downstreamRating: number
  upstreamRating: number
  ratio: number
  status: Severity
  message: string
}

export interface CalculationIssue {
  code: string
  severity: Exclude<Severity, 'ok'>
  title: string
  message: string
  componentUid?: string
  terminalUids?: string[]
}

export interface CalculationResult {
  totalInstalledPowerW: number
  totalCalculatedPowerW: number
  totalApparentPowerVa: number
  totalCurrentA: number
  averageCosPhi: number
  phases: PhaseCalculation[]
  imbalancePct: number
  imbalanceStatus: Severity
  lines: LineCalculation[]
  rcds: RcdCalculation[]
  selectivity: SelectivityCheck[]
  issues: CalculationIssue[]
  mainBreaker?: number
  mainBreakerUtilizationPct?: number
  mainBreakerStatus: Severity
  status: Severity
}

export interface ConnectionValidation {
  valid: boolean
  code?: string
  message?: string
  severity?: Exclude<Severity, 'ok'>
}

export interface WireDraft {
  from: string
  to?: string
  kind: WireKind
  phase?: PhaseTag
  crossSection: number
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  updatedAt: string
  componentCount: number
  lineCount: number
  totalPowerW: number
  status: Severity
}

export interface ToastMessage {
  id: string
  title: string
  message?: string
  tone: 'success' | 'error' | 'warning' | 'info'
}
