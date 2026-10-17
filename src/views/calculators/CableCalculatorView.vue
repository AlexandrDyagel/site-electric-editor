<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertTriangle,
  ArrowRight,
  Cable,
  CheckCircle2,
  CircuitBoard,
  Info,
  Ruler,
  Thermometer,
  Layers3,
} from 'lucide-vue-next'
import type { CableInsulation, CableMaterial, LayingMethod } from '@/types'
import {
  AMPACITY_TABLE,
  CABLE_SECTIONS,
  INSULATION_LABELS,
  LAYING_LABELS,
  MATERIAL_LABELS,
  calculateAmpacity,
  selectStandardBreaker,
  voltageDropPct,
} from '@/data/pue'
import { usePageMeta } from '@/composables/usePageMeta'
import CalculatorTabs from '@/components/calculators/CalculatorTabs.vue'
import FieldShell from '@/components/common/FieldShell.vue'
import { formatNumber } from '@/utils/format'

const phase = ref<1 | 3>(1)
const voltage = ref(230)
const mode = ref<'power' | 'current'>('power')
const powerKw = ref(4.5)
const currentInput = ref(20)
const cosPhi = ref(0.95)
const material = ref<CableMaterial>('copper')
const insulation = ref<CableInsulation>('pvc')
const laying = ref<LayingMethod>('conduit')
const ambientC = ref(25)
const groupCount = ref(1)
const lengthM = ref(20)
const dropLimit = ref(5)

watch(phase, (next) => {
  voltage.value = next === 1 ? 230 : 400
})

const designCurrent = computed(() => {
  if (mode.value === 'current') return Math.max(0, Number(currentInput.value) || 0)
  const p = Math.max(0, Number(powerKw.value) || 0) * 1000
  const cos = Math.min(1, Math.max(0.1, Number(cosPhi.value) || 0.95))
  const u = Math.max(100, Number(voltage.value) || 230)
  return phase.value === 1
    ? p / (u * cos)
    : p / (Math.sqrt(3) * u * cos)
})

const options = computed(() => ({
  material: material.value,
  insulation: insulation.value,
  laying: laying.value,
  ambientC: Math.max(-10, Math.min(60, Number(ambientC.value) || 25)),
  groupCount: Math.max(1, Math.min(8, Number(groupCount.value) || 1)),
  designCurrentA: designCurrent.value,
}))

const rows = computed(() =>
  CABLE_SECTIONS.map((section) => {
    const ampacity = calculateAmpacity(section, options.value)
    const drop = voltageDropPct({
      currentA: designCurrent.value,
      lengthM: Math.max(0, Number(lengthM.value) || 0),
      section,
      material: material.value,
      phase: phase.value,
      cosPhi: Math.min(1, Math.max(0.1, Number(cosPhi.value) || 0.95)),
      voltage: Math.max(100, Number(voltage.value) || 230),
    })
    return {
      section,
      ampacity,
      drop,
      sufficient: ampacity.ampacity >= designCurrent.value && drop <= Number(dropLimit.value),
    }
  }),
)

const recommended = computed(
  () => rows.value.find((row) => row.sufficient) ?? rows.value[rows.value.length - 1],
)

const recommendedBreaker = computed(() => selectStandardBreaker(designCurrent.value, 1))

const factors = computed(() => recommended.value?.ampacity)

const worstDrop = computed(() => recommended.value?.drop ?? 0)

usePageMeta({
  title: 'Расчёт сечения кабеля по ПУЭ — ВОЛЬТ.ЛАБ',
  description:
    'Подбор сечения кабеля по току или мощности с таблицей ПУЭ, поправками на температуру и группу кабелей, проверкой падения напряжения.',
})

const rowStatus = (row: (typeof rows.value)[number]): { label: string; className: string } => {
  if (row.section === recommended.value?.section) {
    return { label: 'Рекомендуем', className: 'bg-volt-400/15 text-volt-800 dark:text-volt-300' }
  }
  if (row.ampacity.ampacity < designCurrent.value) {
    return { label: 'Недостаточно', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-300' }
  }
  if (row.drop > Number(dropLimit.value)) {
    return { label: 'ΔU выше нормы', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' }
  }
  return { label: 'Запас', className: 'text-ink-400 dark:text-cloud-400/60' }
}
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-emerald-300/20 blur-[100px] dark:bg-emerald-400/[.06]"></div>
      <div class="container-page relative py-10 lg:py-14">
        <div class="grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <p class="eyebrow">Калькулятор 02</p>
            <h1 class="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-ink-950 sm:text-4xl lg:text-5xl dark:text-white">
              Сечение кабеля
            </h1>
            <p class="mt-4 max-w-xl text-sm leading-7 text-ink-600 dark:text-cloud-400">
              Таблица допустимых токов ПУЭ с поправками на температуру, группу и способ прокладки.
              Плюс проверка падения напряжения на реальной длине линии.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <span class="chip chip-volt self-start"><Cable :size="12" /> Iдоп × Kтемп × Kгр × Kпрокл</span>
            <CalculatorTabs />
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-10 lg:py-14">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        <div class="surface p-5 sm:p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-extrabold text-ink-900 dark:text-white">Параметры линии</h2>
            <span class="chip">ПУЭ 1.3</span>
          </div>

          <div class="mt-5 space-y-5">
            <div>
              <p class="field-label">Способ расчёта</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="item in [{ value: 'power', label: 'По мощности' }, { value: 'current', label: 'По току' }] as const"
                  :key="item.value"
                  type="button"
                  class="rounded-lg border px-3 py-2 text-[11px] font-bold transition"
                  :class="mode === item.value ? 'border-volt-500 bg-volt-400/10 text-ink-900 dark:text-white' : 'border-cloud-200 text-ink-500 dark:border-white/10 dark:text-cloud-400'"
                  @click="mode = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Сеть" for-id="phase">
                <select id="phase" v-model.number="phase" class="select">
                  <option :value="1">Однофазная 230 В</option>
                  <option :value="3">Трёхфазная 400 В</option>
                </select>
              </FieldShell>
              <FieldShell label="Напряжение" for-id="voltage" suffix="В">
                <input id="voltage" v-model.number="voltage" type="number" min="100" max="1000" class="input tabular" />
              </FieldShell>
            </div>

            <div v-if="mode === 'power'" class="grid grid-cols-2 gap-3">
              <FieldShell label="Мощность" for-id="power" suffix="кВт">
                <input id="power" v-model.number="powerKw" type="number" min="0" step="0.1" class="input tabular" />
              </FieldShell>
              <FieldShell label="cosφ" for-id="cosphi">
                <input id="cosphi" v-model.number="cosPhi" type="number" min="0.5" max="1" step="0.01" class="input tabular" />
              </FieldShell>
            </div>
            <FieldShell v-else label="Расчётный ток" for-id="current" suffix="А">
              <input id="current" v-model.number="currentInput" type="number" min="0" step="0.1" class="input tabular" />
            </FieldShell>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Материал жилы" for-id="material">
                <select id="material" v-model="material" class="select">
                  <option v-for="(label, value) in MATERIAL_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </FieldShell>
              <FieldShell label="Изоляция" for-id="insulation">
                <select id="insulation" v-model="insulation" class="select">
                  <option v-for="(label, value) in INSULATION_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </FieldShell>
            </div>

            <FieldShell label="Прокладка" for-id="laying">
              <select id="laying" v-model="laying" class="select">
                <option v-for="(label, value) in LAYING_LABELS" :key="value" :value="value">{{ label }}</option>
              </select>
            </FieldShell>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Температура" for-id="ambient" suffix="°C">
                <input id="ambient" v-model.number="ambientC" type="number" min="-10" max="60" class="input tabular" />
              </FieldShell>
              <FieldShell label="Кабелей в трассе" for-id="group">
                <input id="group" v-model.number="groupCount" type="number" min="1" max="8" class="input tabular" />
              </FieldShell>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Длина линии" for-id="length" suffix="м">
                <input id="length" v-model.number="lengthM" type="number" min="0" max="1000" class="input tabular" />
              </FieldShell>
              <FieldShell label="ΔU не более" for-id="drop" suffix="%">
                <select id="drop" v-model.number="dropLimit" class="select">
                  <option :value="3">3% (освещение)</option>
                  <option :value="5">5% (силовая)</option>
                </select>
              </FieldShell>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="grid gap-4 sm:grid-cols-[1.2fr_.8fr]">
            <div class="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-ink-900 p-6 text-white sm:p-7">
              <div class="absolute inset-0 bg-grid-dark bg-[size:24px_24px] opacity-45"></div>
              <div class="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-[70px]"></div>
              <div class="relative">
                <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">Рекомендуемое сечение</p>
                <div class="mt-2 flex items-end gap-2">
                  <span class="font-mono text-6xl font-bold leading-none">{{ recommended?.section }}</span>
                  <span class="mb-1 font-mono text-lg text-white/40">мм²</span>
                </div>
                <p class="mt-2 text-[11px] text-cloud-400">
                  {{ MATERIAL_LABELS[material] }} · {{ INSULATION_LABELS[insulation].split(' ')[0] }} · {{ LAYING_LABELS[laying].toLowerCase() }}
                </p>
                <div class="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-2.5">
                  <CheckCircle2 :size="15" class="text-emerald-300" />
                  <span class="text-[11px] font-bold text-emerald-200">
                    Iдоп {{ formatNumber(recommended?.ampacity.ampacity ?? 0, 1) }} А ≥ Iрасч {{ formatNumber(designCurrent, 1) }} А
                  </span>
                </div>
              </div>
            </div>

            <div class="surface flex flex-col justify-between p-5">
              <div>
                <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">Проверка</p>
                <div class="mt-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-ink-500 dark:text-cloud-400">Ток линии</span>
                    <span class="font-mono text-xs font-bold text-ink-900 dark:text-white">{{ formatNumber(designCurrent, 1) }} А</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-ink-500 dark:text-cloud-400">Падение ΔU</span>
                    <span class="font-mono text-xs font-bold" :class="worstDrop > Number(dropLimit) ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'">
                      {{ formatNumber(worstDrop, 2) }}%
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-ink-500 dark:text-cloud-400">Автомат</span>
                    <span class="font-mono text-xs font-bold text-ink-900 dark:text-white">{{ recommendedBreaker ? `C${recommendedBreaker}` : '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-ink-500 dark:text-cloud-400">Запас по току</span>
                    <span class="font-mono text-xs font-bold text-ink-900 dark:text-white">
                      {{ formatNumber(recommended?.ampacity.utilizationPct ?? 0, 0) }}%
                    </span>
                  </div>
                </div>
              </div>
              <div class="mt-4 flex items-start gap-2 rounded-lg bg-cloud-50 p-2.5 dark:bg-white/[.03]">
                <Info :size="12" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
                <p class="text-[9px] leading-4 text-ink-500 dark:text-cloud-400/70">
                  Поправки: Kтемп {{ factors?.temperatureFactor }}, Kгр {{ factors?.groupingFactor }}, Kпрокл {{ factors?.layingFactor }}.
                </p>
              </div>
            </div>
          </div>

          <div class="surface overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-cloud-200 px-5 py-4 dark:border-white/[.07]">
              <div>
                <h2 class="text-sm font-extrabold text-ink-900 dark:text-white">Все стандартные сечения</h2>
                <p class="mt-0.5 text-[10px] text-ink-400 dark:text-cloud-400/60">
                  {{ MATERIAL_LABELS[material] }}, {{ INSULATION_LABELS[insulation] }}, {{ LAYING_LABELS[laying] }}, {{ ambientC }} °C
                </p>
              </div>
              <span class="chip">{{ groupCount }} в трассе</span>
            </div>
            <div class="scroll-thin max-h-[410px] overflow-auto">
              <table class="w-full min-w-[620px] text-left text-[11px]">
                <thead class="sticky top-0 z-10 bg-cloud-50 text-[9px] uppercase tracking-wider text-ink-400 dark:bg-ink-850 dark:text-cloud-400/60">
                  <tr>
                    <th class="px-4 py-2.5 font-extrabold">S, мм²</th>
                    <th class="px-4 py-2.5 font-extrabold">Iтабл</th>
                    <th class="px-4 py-2.5 font-extrabold">Iдоп</th>
                    <th class="px-4 py-2.5 font-extrabold">ΔU</th>
                    <th class="px-4 py-2.5 font-extrabold">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in rows"
                    :key="row.section"
                    class="border-t border-cloud-200/60 transition hover:bg-cloud-50/60 dark:border-white/[.05] dark:hover:bg-white/[.02]"
                    :class="row.section === recommended?.section ? 'bg-volt-400/[.06]' : ''"
                  >
                    <td class="px-4 py-2.5 font-mono font-bold" :class="row.section === recommended?.section ? 'text-volt-800 dark:text-volt-300' : 'text-ink-800 dark:text-cloud-200'">
                      {{ row.section }}
                    </td>
                    <td class="px-4 py-2.5 font-mono text-ink-500 dark:text-cloud-400">{{ row.ampacity.baseAmpacity }}</td>
                    <td class="px-4 py-2.5 font-mono text-ink-700 dark:text-cloud-300">{{ formatNumber(row.ampacity.ampacity, 1) }}</td>
                    <td class="px-4 py-2.5 font-mono" :class="row.drop > Number(dropLimit) ? 'text-amber-600 dark:text-amber-400' : 'text-ink-600 dark:text-cloud-400'">
                      {{ formatNumber(row.drop, 2) }}%
                    </td>
                    <td class="px-4 py-2.5">
                      <span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold" :class="rowStatus(row).className">
                        {{ rowStatus(row).label }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="surface flex gap-2.5 p-4">
              <Thermometer :size="15" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              <div>
                <p class="text-[10px] font-extrabold text-ink-800 dark:text-cloud-200">Температура</p>
                <p class="mt-0.5 text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Kтемп = {{ factors?.temperatureFactor }}</p>
              </div>
            </div>
            <div class="surface flex gap-2.5 p-4">
              <Layers3 :size="15" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              <div>
                <p class="text-[10px] font-extrabold text-ink-800 dark:text-cloud-200">Группировка</p>
                <p class="mt-0.5 text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Kгр = {{ factors?.groupingFactor }}</p>
              </div>
            </div>
            <div class="surface flex gap-2.5 p-4">
              <Ruler :size="15" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              <div>
                <p class="text-[10px] font-extrabold text-ink-800 dark:text-cloud-200">Прокладка</p>
                <p class="mt-0.5 text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Kпрокл = {{ factors?.layingFactor }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-4">
            <AlertTriangle :size="15" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p class="text-[11px] leading-5 text-amber-800/80 dark:text-amber-200/75">
              Таблица учитывает типовые условия. Для прокладки в земле, пучках, лотках и при
              температуре выше 40 °C используйте проектные коэффициенты. Проверьте термическую стойкость при КЗ.
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cloud-200 bg-white/60 p-4 dark:border-white/[.07] dark:bg-white/[.025]">
            <div class="flex items-center gap-2.5">
              <CircuitBoard :size="16" class="text-volt-600 dark:text-volt-400" />
              <p class="text-[11px] font-semibold text-ink-600 dark:text-cloud-300">
                Автомат {{ recommendedBreaker ? `C${recommendedBreaker}` : '—' }} согласован с кабелем {{ recommended?.section }} мм²?
              </p>
            </div>
            <RouterLink to="/calculators/breaker" class="link-arrow">
              Проверить номинал <ArrowRight :size="13" />
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <div class="surface p-5">
          <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">Справочные токи, медь ПВХ</p>
          <div class="mt-3 grid grid-cols-4 gap-2">
            <div v-for="row in AMPACITY_TABLE.slice(0, 8)" :key="row.section" class="rounded-lg bg-cloud-50 px-2 py-2 text-center dark:bg-white/[.03]">
              <p class="font-mono text-[11px] font-bold text-ink-800 dark:text-cloud-200">{{ row.section }}</p>
              <p class="mt-0.5 font-mono text-[9px] text-ink-400 dark:text-cloud-400/50">{{ row.copperPvc }} А</p>
            </div>
          </div>
        </div>
        <div class="surface flex items-center justify-between gap-4 p-5">
          <div>
            <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">Полный расчёт щита</p>
            <p class="mt-2 text-sm font-extrabold text-ink-900 dark:text-white">Проверьте кабели всех линий сразу</p>
            <p class="mt-1 text-[11px] leading-5 text-ink-400 dark:text-cloud-400/60">В редакторе сечение задаётся для каждой группы.</p>
          </div>
          <RouterLink to="/editor" class="btn-primary btn-sm shrink-0">
            В редактор <ArrowRight :size="12" />
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
