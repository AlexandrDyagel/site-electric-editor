import type {
  AmpacityResult,
  CableInsulation,
  CableMaterial,
  LayingMethod,
} from '@/types'

/**
 * Справочные значения длительно допустимого тока по ПУЭ, глава 1.3.
 * Базовые значения приведены для одиночного кабеля при температуре воздуха 30 °C
 * (в земле — 15 °C). Поправочные коэффициенты применяются отдельно.
 * Таблица предназначена для предварительного подбора и не заменяет проект.
 */
export interface AmpacityBaseRow {
  section: number
  copperPvc: number
  copperXlpe: number
  aluminumPvc: number
  aluminumXlpe: number
}

export const AMPACITY_TABLE: AmpacityBaseRow[] = [
  { section: 1.5, copperPvc: 19, copperXlpe: 23, aluminumPvc: 15, aluminumXlpe: 18 },
  { section: 2.5, copperPvc: 27, copperXlpe: 33, aluminumPvc: 21, aluminumXlpe: 25 },
  { section: 4, copperPvc: 34, copperXlpe: 41, aluminumPvc: 26, aluminumXlpe: 32 },
  { section: 6, copperPvc: 46, copperXlpe: 54, aluminumPvc: 34, aluminumXlpe: 42 },
  { section: 10, copperPvc: 60, copperXlpe: 71, aluminumPvc: 44, aluminumXlpe: 55 },
  { section: 16, copperPvc: 80, copperXlpe: 94, aluminumPvc: 60, aluminumXlpe: 74 },
  { section: 25, copperPvc: 101, copperXlpe: 119, aluminumPvc: 76, aluminumXlpe: 94 },
  { section: 35, copperPvc: 123, copperXlpe: 145, aluminumPvc: 92, aluminumXlpe: 114 },
  { section: 50, copperPvc: 153, copperXlpe: 180, aluminumPvc: 115, aluminumXlpe: 142 },
  { section: 70, copperPvc: 196, copperXlpe: 231, aluminumPvc: 147, aluminumXlpe: 181 },
  { section: 95, copperPvc: 238, copperXlpe: 280, aluminumPvc: 179, aluminumXlpe: 221 },
  { section: 120, copperPvc: 276, copperXlpe: 325, aluminumPvc: 207, aluminumXlpe: 256 },
  { section: 150, copperPvc: 319, copperXlpe: 375, aluminumPvc: 239, aluminumXlpe: 296 },
  { section: 185, copperPvc: 364, copperXlpe: 428, aluminumPvc: 273, aluminumXlpe: 338 },
  { section: 240, copperPvc: 430, copperXlpe: 506, aluminumPvc: 322, aluminumXlpe: 399 },
]

export const CABLE_SECTIONS = AMPACITY_TABLE.map((row) => row.section)

export const STANDARD_BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250]

export const LAYING_LABELS: Record<LayingMethod, string> = {
  conduit: 'В трубе / гофре',
  air: 'Открыто, в лотке',
  ground: 'В земле',
}

export const INSULATION_LABELS: Record<CableInsulation, string> = {
  pvc: 'ПВХ (ПУЭ)',
  xlpe: 'XLPE / сшитый ПЭ',
}

export const MATERIAL_LABELS: Record<CableMaterial, string> = {
  copper: 'Медь',
  aluminum: 'Алюминий',
}

const LAYING_FACTORS: Record<LayingMethod, number> = {
  conduit: 0.93,
  air: 1,
  ground: 0.87,
}

const AIR_TEMP_FACTORS: Array<[number, number]> = [
  [20, 1.12],
  [25, 1.06],
  [30, 1],
  [35, 0.94],
  [40, 0.87],
  [45, 0.79],
  [50, 0.71],
  [55, 0.61],
  [60, 0.5],
]

const GROUND_TEMP_FACTORS: Array<[number, number]> = [
  [10, 1.1],
  [15, 1],
  [20, 0.95],
  [25, 0.89],
  [30, 0.84],
  [35, 0.78],
  [40, 0.71],
  [45, 0.64],
  [50, 0.57],
]

/** Линейная интерполяция коэффициента по температуре среды. */
export function temperatureFactor(laying: LayingMethod, ambientC: number): number {
  const table = laying === 'ground' ? GROUND_TEMP_FACTORS : AIR_TEMP_FACTORS
  const first = table[0]
  const last = table[table.length - 1]
  if (!first || !last) return 1
  if (ambientC <= first[0]) return first[1]
  if (ambientC >= last[0]) return last[1]
  for (let i = 0; i < table.length - 1; i += 1) {
    const left = table[i]
    const right = table[i + 1]
    if (left && right && ambientC >= left[0] && ambientC <= right[0]) {
      const ratio = (ambientC - left[0]) / (right[0] - left[0])
      return Number((left[1] + (right[1] - left[1]) * ratio).toFixed(3))
    }
  }
  return 1
}

/** Коэффициент для нескольких параллельных кабелей в одной трассе. */
export function groupingFactor(groupCount: number): number {
  const table = [1, 1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52]
  const safeCount = Math.max(1, Math.min(table.length - 1, Math.round(groupCount)))
  return table[safeCount] ?? 0.52
}

export function baseAmpacity(
  section: number,
  material: CableMaterial,
  insulation: CableInsulation,
): number {
  const row = AMPACITY_TABLE.find((item) => item.section === section)
  if (!row) return 0
  if (material === 'copper') {
    return insulation === 'pvc' ? row.copperPvc : row.copperXlpe
  }
  return insulation === 'pvc' ? row.aluminumPvc : row.aluminumXlpe
}

export interface AmpacityOptions {
  material: CableMaterial
  insulation: CableInsulation
  laying: LayingMethod
  ambientC: number
  groupCount: number
  designCurrentA: number
}

/** Итоговая допустимая токовая нагрузка с поправочными коэффициентами. */
export function calculateAmpacity(section: number, options: AmpacityOptions): AmpacityResult {
  const base = baseAmpacity(section, options.material, options.insulation)
  const temp = temperatureFactor(options.laying, options.ambientC)
  const group = groupingFactor(options.groupCount)
  const laying = LAYING_FACTORS[options.laying]
  const ampacity = base * temp * group * laying
  return {
    section,
    baseAmpacity: base,
    temperatureFactor: temp,
    groupingFactor: group,
    layingFactor: laying,
    ampacity: Number(ampacity.toFixed(1)),
    utilizationPct:
      options.designCurrentA > 0
        ? Number(((options.designCurrentA / Math.max(ampacity, 0.01)) * 100).toFixed(1))
        : 0,
  }
}

/** Первое сечение, у которого допустимый ток не меньше расчётного. */
export function selectCableSection(
  designCurrentA: number,
  options: Omit<AmpacityOptions, 'designCurrentA'>,
): AmpacityResult | null {
  const results = CABLE_SECTIONS.map((section) =>
    calculateAmpacity(section, { ...options, designCurrentA }),
  )
  return results.find((item) => item.ampacity >= designCurrentA) ?? results[results.length - 1] ?? null
}

/** Стандартный номинал автомата не ниже расчётного тока. */
export function selectStandardBreaker(currentA: number, reserve = 1): number | null {
  const target = currentA * reserve
  return STANDARD_BREAKERS.find((rating) => rating >= target) ?? null
}

export function nearestStandardBreaker(currentA: number): number {
  const sorted = [...STANDARD_BREAKERS].sort(
    (a, b) => Math.abs(a - currentA) - Math.abs(b - currentA),
  )
  return sorted[0] ?? 6
}

/**
 * Падение напряжения, %.
 * Для однофазной линии учитывается прямой и обратный проводник (2 × L),
 * для трёхфазной — линейное напряжение и коэффициент √3.
 */
export function voltageDropPct(params: {
  currentA: number
  lengthM: number
  section: number
  material: CableMaterial
  phase: 1 | 3
  cosPhi: number
  voltage: number
}): number {
  const resistivity = params.material === 'copper' ? 0.0175 : 0.028
  const sinPhi = Math.sqrt(Math.max(0, 1 - params.cosPhi ** 2))
  // Индуктивным сопротивлением для малых сечений пренебрегаем, но учитываем
  // реактивную составляющую через косинус, чтобы оценка не была заниженной.
  const inductive = 0.00008 * params.lengthM * sinPhi
  const active =
    params.phase === 3
      ? (Math.sqrt(3) * params.currentA * params.lengthM * resistivity * params.cosPhi) /
        params.section
      : (2 * params.currentA * params.lengthM * resistivity * params.cosPhi) / params.section
  const reactive =
    params.phase === 3
      ? Math.sqrt(3) * params.currentA * inductive
      : 2 * params.currentA * inductive
  const delta = active + reactive
  return Number(((delta / params.voltage) * 100).toFixed(2))
}
