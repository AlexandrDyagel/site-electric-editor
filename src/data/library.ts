import type {
  ComponentCategory,
  ComponentDef,
  PoleCount,
  TerminalDef,
  TerminalKind,
} from '@/types'

export const MODULE_WIDTH = 50
export const COMPONENT_HEIGHT = 108
export const COMPONENT_GAP = 2
export const RAIL_X = 48
export const RAIL_OFFSET_Y = 64
export const RAIL_STEP = 178
export const PANEL_PAD = 32
export const RAIL_BAR_HEIGHT = 18

export const DEFAULT_RAIL_CAPACITY = 16
export const MAX_RAILS = 5

export const CATEGORY_META: Record<
  ComponentCategory,
  { label: string; short: string; description: string; icon: string }
> = {
  input: {
    label: 'Ввод и разъединение',
    short: 'Ввод',
    description: 'Разъединители, клеммные блоки, вводные выключатели',
    icon: 'input',
  },
  breakers: {
    label: 'Автоматические выключатели',
    short: 'Автоматы',
    description: 'Модульные автоматы 1P–4P, кривые B/C/D',
    icon: 'breaker',
  },
  rcd: {
    label: 'УЗО',
    short: 'УЗО',
    description: 'Противопожарные и защитные УЗО 2P/4P',
    icon: 'rcd',
  },
  rcbo: {
    label: 'Дифавтоматы',
    short: 'Дифы',
    description: 'Комбинированная защита от КЗ и утечки',
    icon: 'rcbo',
  },
  protection: {
    label: 'Реле и коммутация',
    short: 'Реле',
    description: 'Реле напряжения, времени, контакторы',
    icon: 'relay',
  },
  metering: {
    label: 'Учёт электроэнергии',
    short: 'Счётчики',
    description: 'Однофазные и трёхфазные счётчики',
    icon: 'meter',
  },
  buses: {
    label: 'Шины и распределение',
    short: 'Шины',
    description: 'N/PE шины, гребёнки, кросс-модули',
    icon: 'bus',
  },
  accessories: {
    label: 'Аксессуары',
    short: 'Аксессуары',
    description: 'Розетки, звонки, индикаторы на DIN-рейку',
    icon: 'socket',
  },
}

const BRANDS = ['ABB', 'Schneider Electric', 'IEK', 'Legrand', 'Hager'] as const
const SERIES: Record<(typeof BRANDS)[number], string> = {
  ABB: 'S200 / System pro M',
  'Schneider Electric': 'Acti9 / Resi9',
  IEK: 'ARMAT / PROxima',
  Legrand: 'DX³ / TX³',
  Hager: 'MZ / ADC',
}

const brandFactor: Record<(typeof BRANDS)[number], number> = {
  ABB: 1.28,
  'Schneider Electric': 1.22,
  IEK: 0.82,
  Legrand: 1.3,
  Hager: 1.18,
}

const poleKinds = (poles: PoleCount): TerminalKind[] => {
  switch (poles) {
    case 1:
      return ['L1']
    case 2:
      return ['L1', 'N']
    case 3:
      return ['L1', 'L2', 'L3']
    case 4:
      return ['L1', 'L2', 'L3', 'N']
  }
}

function passThrough(kinds: TerminalKind[]): TerminalDef[] {
  return kinds.flatMap((kind, index) => [
    { kind, side: 'in' as const, index, label: `${kind}` },
    { kind, side: 'out' as const, index, label: `${kind}` },
  ])
}

const roundPrice = (value: number): number => Math.round(value / 10) * 10

function breakerDefs(): ComponentDef[] {
  const defs: ComponentDef[] = []
  const currents = [6, 10, 16, 20, 25, 32, 40, 50, 63]
  const curves = ['B', 'C', 'D'] as const
  const polesList = [1, 2, 3, 4] as const
  let brandIndex = 0
  for (const poles of polesList) {
    for (const curve of curves) {
      for (const ratedCurrent of currents) {
        const brand = BRANDS[brandIndex % BRANDS.length] ?? 'ABB'
        brandIndex += 1
        const polesLabel = poles === 1 ? '1P' : `${poles}P`
        const polarity = poles === 2 ? 'L+N' : poles === 4 ? '3P+N' : polesLabel
        defs.push({
          id: `br-${poles}p-${curve.toLowerCase()}-${ratedCurrent}`,
          name: `Автомат ${polesLabel} ${curve}${ratedCurrent}`,
          shortName: `${curve}${ratedCurrent}`,
          category: 'breakers',
          brand,
          series: SERIES[brand],
          poles,
          ratedCurrent,
          tripCurve: curve,
          terminals: passThrough(poleKinds(poles)),
          price: roundPrice(
            (210 + ratedCurrent * 5.4) * (1 + (poles - 1) * 0.33) * brandFactor[brand],
          ),
          sizeModules: poles,
          description: `Модульный автоматический выключатель ${polarity}, характеристика ${curve}, номинал ${ratedCurrent} А. Отключающая способность 6 кА.`,
          breakingCapacity: 6000,
          protective: true,
        })
      }
    }
  }
  return defs
}

function rcdDefs(): ComponentDef[] {
  const defs: ComponentDef[] = []
  const ratings = [25, 40, 63] as const
  const leakages = [10, 30, 100, 300] as const
  let brandIndex = 1
  for (const poles of [2, 4] as const) {
    for (const ratedCurrent of ratings) {
      for (const residualCurrent of leakages) {
        const brand = BRANDS[brandIndex % BRANDS.length] ?? 'ABB'
        brandIndex += 1
        defs.push({
          id: `rcd-${poles}p-${ratedCurrent}-${residualCurrent}`,
          name: `УЗО ${poles}P ${ratedCurrent}А ${residualCurrent}мА`,
          shortName: `${ratedCurrent}/${residualCurrent}`,
          category: 'rcd',
          brand,
          series: SERIES[brand],
          poles,
          ratedCurrent,
          residualCurrent,
          terminals: passThrough(poleKinds(poles)),
          price: roundPrice((1750 + ratedCurrent * 22 + residualCurrent * 2.4) * brandFactor[brand]),
          sizeModules: poles,
          description: `УЗО ${poles}P на ${ratedCurrent} А, дифференциальный ток ${residualCurrent} мА. Тип AC.`,
          breakingCapacity: 6000,
          protective: false,
        })
      }
    }
  }
  return defs
}

function rcboDefs(): ComponentDef[] {
  const defs: ComponentDef[] = []
  const currents = [6, 10, 16, 20, 25, 32, 40]
  const curves = ['B', 'C'] as const
  const leakages = [10, 30] as const
  let brandIndex = 2
  for (const poles of [2, 4] as const) {
    for (const curve of curves) {
      for (const ratedCurrent of currents) {
        for (const residualCurrent of leakages) {
          const brand = BRANDS[brandIndex % BRANDS.length] ?? 'ABB'
          brandIndex += 1
          defs.push({
            id: `rcbo-${poles}p-${curve.toLowerCase()}-${ratedCurrent}-${residualCurrent}`,
            name: `Дифавтомат ${poles === 2 ? '1P+N' : '3P+N'} ${curve}${ratedCurrent} ${residualCurrent}мА`,
            shortName: `${curve}${ratedCurrent}/${residualCurrent}`,
            category: 'rcbo',
            brand,
            series: SERIES[brand],
            poles,
            ratedCurrent,
            residualCurrent,
            tripCurve: curve,
            terminals: passThrough(poleKinds(poles)),
            price: roundPrice(
              (2100 + ratedCurrent * 34 + residualCurrent * 8) * brandFactor[brand],
            ),
            sizeModules: poles,
            description: `Дифференциальный автомат ${curve}${ratedCurrent}, уставка ${residualCurrent} мА, 6 кА.`,
            breakingCapacity: 6000,
            protective: true,
          })
        }
      }
    }
  }
  return defs
}

function specialDefs(): ComponentDef[] {
  return [
    {
      id: 'relay-voltage-2p',
      name: 'Реле напряжения 2P',
      shortName: 'РН 63А',
      category: 'protection',
      brand: 'ABB',
      series: 'Voltage guard',
      poles: 2,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'N']),
      price: 2790,
      sizeModules: 2,
      description: 'Реле контроля напряжения с регулируемыми порогами 170–270 В и задержкой 0,1–10 с.',
    },
    {
      id: 'relay-voltage-4p',
      name: 'Реле напряжения 3Ф',
      shortName: 'РН 3Ф',
      category: 'protection',
      brand: 'Hager',
      series: 'Voltage guard',
      poles: 4,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'L2', 'L3', 'N']),
      price: 5640,
      sizeModules: 4,
      description: 'Трёхфазное реле контроля напряжения и порядка чередования фаз.',
    },
    {
      id: 'relay-timer-2p',
      name: 'Реле времени 2P',
      shortName: 'Таймер',
      category: 'protection',
      brand: 'IEK',
      series: 'Timer',
      poles: 2,
      ratedCurrent: 16,
      terminals: passThrough(['L1', 'N']),
      price: 1890,
      sizeModules: 2,
      description: 'Программируемое реле времени для управления освещением и вентиляцией.',
    },
    {
      id: 'contactor-2p-25',
      name: 'Контактор 2P 25А',
      shortName: 'КМ 25',
      category: 'protection',
      brand: 'Schneider Electric',
      series: 'Acti9 iCT',
      poles: 2,
      ratedCurrent: 25,
      terminals: passThrough(['L1', 'N']),
      price: 2340,
      sizeModules: 2,
      description: 'Модульный контактор 25 А с катушкой 230 В для коммутации нагрузки.',
    },
    {
      id: 'contactor-4p-40',
      name: 'Контактор 4P 40А',
      shortName: 'КМ 40',
      category: 'protection',
      brand: 'ABB',
      series: 'ESB',
      poles: 4,
      ratedCurrent: 40,
      terminals: passThrough(['L1', 'L2', 'L3', 'N']),
      price: 4890,
      sizeModules: 4,
      description: 'Четырёхполюсный модульный контактор для трёхфазной нагрузки.',
    },
    {
      id: 'impulse-relay-2p',
      name: 'Импульсное реле 2P',
      shortName: 'ИР',
      category: 'protection',
      brand: 'Legrand',
      series: 'CX³',
      poles: 2,
      ratedCurrent: 16,
      terminals: passThrough(['L1', 'N']),
      price: 3120,
      sizeModules: 2,
      description: 'Импульсное реле для управления светом с нескольких постов.',
    },
    {
      id: 'meter-1ph',
      name: 'Счётчик 1Ф',
      shortName: 'Счётчик',
      category: 'metering',
      brand: 'IEK',
      series: 'Меркурий',
      poles: 2,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'N']),
      price: 4280,
      sizeModules: 2,
      description: 'Однофазный многотарифный счётчик с DIN-креплением, класс точности 1.0.',
    },
    {
      id: 'meter-3ph',
      name: 'Счётчик 3Ф',
      shortName: 'Счётчик 3Ф',
      category: 'metering',
      brand: 'Schneider Electric',
      series: 'iEM2000',
      poles: 4,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'L2', 'L3', 'N']),
      price: 9870,
      sizeModules: 4,
      description: 'Трёхфазный многофункциональный счётчик электроэнергии, класс 1.0.',
    },
    {
      id: 'bus-n-8',
      name: 'Шина N 8 выходов',
      shortName: 'N-шина',
      category: 'buses',
      brand: 'IEK',
      series: 'Шина',
      poles: 1,
      terminals: [
        { kind: 'N', side: 'in', index: 0, label: 'N вход' },
        ...Array.from({ length: 8 }, (_, index) => ({
          kind: 'N' as const,
          side: 'out' as const,
          index,
          label: `N ${index + 1}`,
        })),
      ],
      price: 760,
      sizeModules: 4,
      description: 'Силовая нулевая шина на 8 винтовых зажимов, 63 А.',
    },
    {
      id: 'bus-pe-8',
      name: 'Шина PE 8 выходов',
      shortName: 'PE-шина',
      category: 'buses',
      brand: 'IEK',
      series: 'Шина',
      poles: 1,
      terminals: [
        { kind: 'PE', side: 'in', index: 0, label: 'PE вход' },
        ...Array.from({ length: 8 }, (_, index) => ({
          kind: 'PE' as const,
          side: 'out' as const,
          index,
          label: `PE ${index + 1}`,
        })),
      ],
      price: 790,
      sizeModules: 4,
      description: 'Шина заземления на 8 зажимов, 63 А.',
    },
    {
      id: 'bus-l-6',
      name: 'Гребёнка L1 6 выходов',
      shortName: 'Гребёнка',
      category: 'buses',
      brand: 'ABB',
      series: 'Busbar',
      poles: 1,
      terminals: [
        { kind: 'L1', side: 'in', index: 0, label: 'L1 вход' },
        ...Array.from({ length: 6 }, (_, index) => ({
          kind: 'L1' as const,
          side: 'out' as const,
          index,
          label: `L1 ${index + 1}`,
        })),
      ],
      price: 980,
      sizeModules: 3,
      description: 'Гребенчатая распределительная шина для группы однополюсных автоматов.',
    },
    {
      id: 'cross-module-4p',
      name: 'Кросс-модуль 4P',
      shortName: 'Кросс',
      category: 'buses',
      brand: 'Hager',
      series: 'KXA',
      poles: 4,
      terminals: passThrough(['L1', 'L2', 'L3', 'N']),
      price: 1540,
      sizeModules: 4,
      description: 'Кросс-модуль для распределения четырёх проводников на несколько линий.',
    },
    {
      id: 'socket-din',
      name: 'Розетка на DIN-рейку',
      shortName: 'Розетка',
      category: 'accessories',
      brand: 'Legrand',
      series: 'DIN',
      poles: 2,
      ratedCurrent: 16,
      terminals: passThrough(['L1', 'N']),
      price: 890,
      sizeModules: 2,
      description: 'Сервисная розетка 16 А на DIN-рейку для монтажных работ.',
    },
    {
      id: 'bell-din',
      name: 'Звонок на DIN-рейку',
      shortName: 'Звонок',
      category: 'accessories',
      brand: 'IEK',
      series: 'DIN',
      poles: 2,
      terminals: passThrough(['L1', 'N']),
      price: 620,
      sizeModules: 1,
      description: 'Модульный звонок 230 В для монтажа в щите.',
    },
    {
      id: 'indicator-2p',
      name: 'Индикатор 2P',
      shortName: 'Индикатор',
      category: 'accessories',
      brand: 'ABB',
      series: 'Signal',
      poles: 2,
      terminals: passThrough(['L1', 'N']),
      price: 410,
      sizeModules: 1,
      description: 'Светодиодный индикатор наличия напряжения.',
    },
    {
      id: 'disconnector-2p-63',
      name: 'Вводной разъединитель 2P',
      shortName: 'Ввод 63',
      category: 'input',
      brand: 'ABB',
      series: 'OT / DIN',
      poles: 2,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'N']),
      price: 2280,
      sizeModules: 2,
      description: 'Двухполюсный вводной разъединитель 63 А с видимым разрывом.',
    },
    {
      id: 'disconnector-4p-63',
      name: 'Вводной разъединитель 4P+N',
      shortName: 'Ввод 4P',
      category: 'input',
      brand: 'Schneider Electric',
      series: 'Acti9',
      poles: 4,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'L2', 'L3', 'N', 'PE']),
      price: 3860,
      sizeModules: 4,
      description: 'Четырёхполюсный вводной разъединитель 63 А с клеммой PE.',
    },
    {
      id: 'terminal-block-5p',
      name: 'Вводной клеммный блок 5P',
      shortName: 'Клеммы 5P',
      category: 'input',
      brand: 'IEK',
      series: 'ЗВИ',
      poles: 4,
      ratedCurrent: 63,
      terminals: passThrough(['L1', 'L2', 'L3', 'N', 'PE']),
      price: 1140,
      sizeModules: 5,
      description: 'Пятиполюсный клеммный блок для подключения вводного кабеля.',
    },
    {
      id: 'main-breaker-4p-40',
      name: 'Вводной автомат 4P 40А',
      shortName: 'QF ввод',
      category: 'input',
      brand: 'ABB',
      series: 'S200',
      poles: 4,
      ratedCurrent: 40,
      tripCurve: 'C',
      terminals: passThrough(['L1', 'L2', 'L3', 'N']),
      price: 2860,
      sizeModules: 4,
      description: 'Главный вводной автоматический выключатель 40 А, характеристика C, 6 кА.',
      breakingCapacity: 6000,
      protective: true,
    },
  ]
}

export const COMPONENT_LIBRARY: ComponentDef[] = [
  ...breakerDefs(),
  ...rcdDefs(),
  ...rcboDefs(),
  ...specialDefs(),
]

export const COMPONENT_BY_ID: ReadonlyMap<string, ComponentDef> = new Map(
  COMPONENT_LIBRARY.map((def) => [def.id, def]),
)

export function getComponentDef(defId: string): ComponentDef | undefined {
  return COMPONENT_BY_ID.get(defId)
}

export function categoryLabel(category: ComponentCategory): string {
  return CATEGORY_META[category].label
}
