<script setup lang="ts">
import { computed, ref } from 'vue'
import { Activity, ShieldCheck, Zap } from 'lucide-vue-next'

interface DemoModule {
  id: string
  label: string
  sub: string
  span: number
  tone: 'main' | 'breaker' | 'rcd' | 'bus' | 'aux'
  name: string
  detail: string
  metric: string
}

const rows: DemoModule[][] = [
  [
    { id: 'input', label: 'ВВОД', sub: '4P 63A', span: 4, tone: 'main', name: 'Вводной разъединитель', detail: '4P + PE, видимый разрыв, 63 А', metric: '3 фазы' },
    { id: 'main', label: 'QF1', sub: 'C40', span: 4, tone: 'main', name: 'Вводной автомат', detail: 'ABB S200, 4P, характеристика C, 6 кА', metric: '40 А' },
    { id: 'meter', label: 'WH', sub: '3Ф', span: 4, tone: 'aux', name: 'Счётчик электроэнергии', detail: 'Трёхфазный учёт, класс точности 1.0', metric: '25.1 кВт·ч' },
    { id: 'rcd', label: 'УЗО', sub: '100мА', span: 4, tone: 'rcd', name: 'Противопожарное УЗО', detail: '4P, 40 А, 100 мА, тип AC', metric: '12.6 мА' },
  ],
  [
    { id: 'boiler', label: 'QF2', sub: 'C16', span: 3, tone: 'breaker', name: 'Бойлер', detail: '3P, C16, кабель 2,5 мм², линия 12 м', metric: '11.9 А' },
    { id: 'ac', label: 'QF3', sub: 'C16', span: 3, tone: 'breaker', name: 'Кондиционер', detail: '3P, C16, кабель 2,5 мм², линия 18 м', metric: '11.9 А' },
    { id: 'light', label: 'C10', sub: '', span: 1, tone: 'breaker', name: 'Освещение', detail: '1P, C10, 1,5 мм², группа L1', metric: '5.5 А' },
    { id: 'kitchen', label: 'C16', sub: '', span: 1, tone: 'breaker', name: 'Розетки кухни', detail: '1P, C16, 2,5 мм², группа L2', metric: '7.7 А' },
    { id: 'vent', label: 'C6', sub: '', span: 1, tone: 'breaker', name: 'Вентиляция', detail: '1P, C6, 1,5 мм², группа L3', metric: '1.7 А' },
    { id: 'bath', label: 'DIF', sub: '16/30', span: 2, tone: 'rcd', name: 'Розетки ванной', detail: 'Дифавтомат 1P+N, C16, 30 мА', metric: '5.3 А' },
    { id: 'relay', label: 'РН', sub: '63A', span: 2, tone: 'aux', name: 'Реле напряжения', detail: 'Контроль 170–265 В, задержка 20 с', metric: '230 В' },
    { id: 'timer', label: 'Т', sub: '', span: 2, tone: 'aux', name: 'Реле времени', detail: 'Управление вентиляцией по расписанию', metric: 'ON 08:00' },
  ],
  [
    { id: 'nbus', label: 'N', sub: '8 выходов', span: 4, tone: 'bus', name: 'Шина N', detail: 'Силовая нулевая шина, 63 А, 8 зажимов', metric: 'N' },
    { id: 'pebus', label: 'PE', sub: '8 выходов', span: 4, tone: 'bus', name: 'Шина PE', detail: 'Шина заземления, изолированное крепление', metric: 'PE' },
    { id: 'lbus', label: 'L1', sub: 'гребёнка', span: 3, tone: 'bus', name: 'Гребёнка L1', detail: 'Распределение фазы L1 на 6 автоматов', metric: 'L1' },
    { id: 'indicator', label: 'LED', sub: '', span: 1, tone: 'aux', name: 'Индикатор сети', detail: 'Наличие напряжения на вводе', metric: 'LIVE' },
    { id: 'spare', label: '+', sub: 'резерв', span: 4, tone: 'aux', name: 'Резервные модули', detail: '4 свободных модуля для будущих линий', metric: '4 мод.' },
  ],
]

const allModules = rows.flat()
const selectedId = ref('rcd')
const selected = computed(() => allModules.find((item) => item.id === selectedId.value) ?? allModules[0])

const toneClass: Record<DemoModule['tone'], string> = {
  main: 'bg-white/[.09] border-white/15',
  breaker: 'bg-ink-800 border-white/10',
  rcd: 'bg-volt-400/[.14] border-volt-400/30',
  bus: 'bg-sky-400/10 border-sky-400/20',
  aux: 'bg-white/[.035] border-white/[.07]',
}

function select(id: string): void {
  selectedId.value = id
}
</script>

<template>
  <div class="relative">
    <div
      class="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_60%_20%,rgba(174,239,28,.16),transparent_55%)] blur-2xl"
    ></div>

    <div
      class="grain relative overflow-hidden rounded-[26px] border border-white/10 bg-ink-900 p-3 shadow-[0_40px_100px_-50px_rgba(0,0,0,.9)] sm:p-4"
    >
      <div class="absolute inset-0 bg-grid-dark bg-[size:22px_22px] opacity-60"></div>
      <div class="relative">
        <div class="mb-3 flex items-center justify-between px-1.5">
          <div class="flex items-center gap-2">
            <span class="flex gap-1.5">
              <span class="h-2 w-2 rounded-full bg-rose-400/70"></span>
              <span class="h-2 w-2 rounded-full bg-amber-300/70"></span>
              <span class="h-2 w-2 rounded-full bg-emerald-400/70"></span>
            </span>
            <span class="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
              panel / apt-3ph
            </span>
          </div>
          <span class="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
            <span class="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400"></span>
            LIVE
          </span>
        </div>

        <div class="relative rounded-2xl border border-white/[.06] bg-ink-950/80 p-3 sm:p-4">
          <svg
            class="pointer-events-none absolute inset-0 h-full w-full opacity-70"
            viewBox="0 0 600 330"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M74 30V70H496V100" stroke="#c97a3a" stroke-width="1.3" opacity=".55" />
            <path d="M120 30V56H448V100" stroke="#66717f" stroke-width="1.3" opacity=".45" />
            <path d="M160 30V42H400V100" stroke="#8b95a5" stroke-width="1.3" opacity=".4" />
            <path d="M205 30V88H300V130" stroke="#4f8cff" stroke-width="1.3" opacity=".45" />
            <path d="M74 120V162H230V190" stroke="#c97a3a" stroke-width="1.2" opacity=".35" />
            <path d="M520 120V162H430V190" stroke="#8b95a5" stroke-width="1.2" opacity=".3" />
            <path d="M120 222V250H300V282" stroke="#4f8cff" stroke-width="1.2" opacity=".3" />
            <path d="M470 222V250H340V282" stroke="#a3e635" stroke-width="1.2" opacity=".3" />
            <circle cx="300" cy="130" r="2.4" fill="#94d40d" />
            <circle cx="230" cy="190" r="2.4" fill="#94d40d" />
            <circle cx="430" cy="190" r="2.4" fill="#94d40d" />
            <circle cx="300" cy="282" r="2.4" fill="#4f8cff" />
            <circle cx="340" cy="282" r="2.4" fill="#a3e635" />
          </svg>

          <div class="relative space-y-3">
            <div v-for="(row, rowIndex) in rows" :key="rowIndex">
              <div class="mb-1 flex items-center justify-between px-0.5">
                <span class="font-mono text-[8px] uppercase tracking-widest text-white/25">
                  R{{ rowIndex + 1 }}
                </span>
                <span class="font-mono text-[8px] text-white/20">DIN 35</span>
              </div>
              <div class="grid grid-cols-16 gap-[3px] rounded-md bg-black/30 p-1">
                <button
                  v-for="module in row"
                  :key="module.id"
                  type="button"
                  class="group relative flex h-[48px] flex-col items-center justify-center overflow-hidden rounded-[3px] border text-center transition duration-200 hover:-translate-y-0.5 sm:h-[52px]"
                  :class="[
                    toneClass[module.tone],
                    selectedId === module.id ? 'ring-1 ring-volt-400 shadow-[0_0_20px_-4px_rgba(174,239,28,.55)]' : '',
                  ]"
                  :style="{ gridColumn: `span ${module.span}` }"
                  :aria-label="module.name"
                  @click="select(module.id)"
                >
                  <span
                    v-if="module.tone === 'breaker'"
                    class="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-amber-300/80 to-transparent"
                  ></span>
                  <span
                    v-else-if="module.tone === 'rcd'"
                    class="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-volt-400 to-transparent"
                  ></span>
                  <span
                    v-else-if="module.tone === 'bus'"
                    class="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-sky-400 to-transparent"
                  ></span>
                  <span
                    class="font-mono text-[10px] font-bold leading-none text-white/85 sm:text-[11px]"
                    :class="module.tone === 'bus' ? 'text-sky-200' : ''"
                  >
                    {{ module.label }}
                  </span>
                  <span v-if="module.sub" class="mt-1 font-mono text-[7px] leading-none text-white/35 sm:text-[8px]">
                    {{ module.sub }}
                  </span>
                  <span
                    class="mt-1 h-[2px] w-3 rounded-full transition"
                    :class="selectedId === module.id ? 'bg-volt-400' : 'bg-white/10 group-hover:bg-white/25'"
                  ></span>
                </button>
              </div>
              <div class="relative mt-[-2px] h-[6px] rounded-sm bg-gradient-to-b from-slate-500/50 to-slate-700/20"></div>
            </div>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5">
          <div class="min-w-0">
            <p class="truncate text-[11px] font-bold text-white/90">{{ selected?.name }}</p>
            <p class="mt-0.5 truncate text-[9px] text-white/35">{{ selected?.detail }}</p>
          </div>
          <span class="shrink-0 rounded-md bg-volt-400/10 px-2 py-1 font-mono text-[9px] font-bold text-volt-300">
            {{ selected?.metric }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="absolute -right-3 -top-5 hidden items-center gap-2.5 rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2.5 shadow-xl backdrop-blur md:flex lg:-right-6"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-volt-400/10 text-volt-300">
        <Activity :size="15" />
      </span>
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-wider text-white/35">Перекос фаз</p>
        <p class="font-mono text-xs font-bold text-white">6,8% <span class="text-emerald-300">норма</span></p>
      </div>
    </div>

    <div
      class="absolute -bottom-4 left-4 hidden items-center gap-2.5 rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2.5 shadow-xl backdrop-blur sm:flex lg:-left-8"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
        <ShieldCheck :size="15" />
      </span>
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-wider text-white/35">Селективность</p>
        <p class="font-mono text-xs font-bold text-white">40 / 16 А <span class="text-emerald-300">×2,5</span></p>
      </div>
    </div>

    <div
      class="absolute -left-3 top-10 hidden items-center gap-2 rounded-full border border-volt-400/20 bg-volt-400/10 px-2.5 py-1.5 backdrop-blur lg:flex"
    >
      <Zap :size="12" class="text-volt-300" />
      <span class="font-mono text-[9px] font-bold text-volt-200">23,8 A</span>
    </div>
  </div>
</template>

<style scoped>
.grid-cols-16 {
  grid-template-columns: repeat(16, minmax(0, 1fr));
}
</style>
