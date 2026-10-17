<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertTriangle,
  ArrowRight,
  Cable,
  CheckCircle2,
  CircuitBoard,
  Gauge,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-vue-next'
import type { CableInsulation, CableMaterial, LayingMethod, TripCurve } from '@/types'
import {
  CABLE_SECTIONS,
  INSULATION_LABELS,
  LAYING_LABELS,
  MATERIAL_LABELS,
  STANDARD_BREAKERS,
  calculateAmpacity,
  selectStandardBreaker,
} from '@/data/pue'
import { usePageMeta } from '@/composables/usePageMeta'
import CalculatorTabs from '@/components/calculators/CalculatorTabs.vue'
import FieldShell from '@/components/common/FieldShell.vue'
import { formatNumber } from '@/utils/format'

type LoadKind = 'lighting' | 'socket' | 'heating' | 'motor' | 'other'

const loadKinds: Array<{
  value: LoadKind
  label: string
  curve: TripCurve
  description: string
  defaultReserve: number
}> = [
  { value: 'lighting', label: 'Освещение', curve: 'B', description: 'Лампы, драйверы, длинные линии', defaultReserve: 10 },
  { value: 'socket', label: 'Розетки', curve: 'C', description: 'Бытовая техника, БП', defaultReserve: 15 },
  { value: 'heating', label: 'Нагрев', curve: 'C', description: 'ТЭН, бойлер, тёплый пол', defaultReserve: 10 },
  { value: 'motor', label: 'Двигатель', curve: 'D', description: 'Насос, компрессор, станок', defaultReserve: 20 },
  { value: 'other', label: 'Смешанная', curve: 'C', description: 'Универсальная группа', defaultReserve: 15 },
]

const loadKind = ref<LoadKind>('socket')
const phase = ref<1 | 3>(1)
const voltage = ref(230)
const powerKw = ref(3.2)
const cosPhi = ref(0.95)
const efficiency = ref(100)
const reserve = ref(15)
const cableSection = ref(2.5)
const material = ref<CableMaterial>('copper')
const insulation = ref<CableInsulation>('pvc')
const laying = ref<LayingMethod>('conduit')
const ambientC = ref(25)
const groupCount = ref(1)
const selectedRating = ref<number | null>(null)

watch(phase, (next) => {
  voltage.value = next === 1 ? 230 : 400
})

watch(loadKind, (next) => {
  const kind = loadKinds.find((item) => item.value === next)
  if (kind) {
    reserve.value = kind.defaultReserve
    selectedRating.value = null
  }
})

watch([powerKw, cosPhi, efficiency, reserve, phase, voltage, cableSection, material, insulation, laying, ambientC, groupCount], () => {
  selectedRating.value = null
})

const current = computed(() => {
  const p = Math.max(0, Number(powerKw.value) || 0) * 1000
  const cos = Math.min(1, Math.max(0.1, Number(cosPhi.value) || 0.95))
  const eff = Math.min(100, Math.max(50, Number(efficiency.value) || 100)) / 100
  const u = Math.max(100, Number(voltage.value) || 230)
  return phase.value === 1 ? p / (u * cos * eff) : p / (Math.sqrt(3) * u * cos * eff)
})

const designCurrent = computed(
  () => current.value * (1 + Math.max(0, Math.min(100, Number(reserve.value) || 0)) / 100),
)

const recommendedRating = computed(() => selectStandardBreaker(designCurrent.value, 1))
const activeRating = computed(() => selectedRating.value ?? recommendedRating.value)
const curve = computed(
  () => loadKinds.find((item) => item.value === loadKind.value)?.curve ?? 'C',
)

const ampacity = computed(() =>
  calculateAmpacity(cableSection.value, {
    material: material.value,
    insulation: insulation.value,
    laying: laying.value,
    ambientC: Math.max(-10, Math.min(60, Number(ambientC.value) || 25)),
    groupCount: Math.max(1, Math.min(8, Number(groupCount.value) || 1)),
    designCurrentA: designCurrent.value,
  }),
)

const breakerPass = computed(
  () => activeRating.value !== null && activeRating.value >= designCurrent.value,
)
const cablePass = computed(
  () => activeRating.value !== null && ampacity.value.ampacity >= activeRating.value,
)
const currentPass = computed(() => ampacity.value.ampacity >= designCurrent.value)
const allPass = computed(() => breakerPass.value && cablePass.value && currentPass.value)

const statusText = computed(() => {
  if (!activeRating.value) return 'Ток вне стандартного ряда — требуется расчёт по проекту'
  if (!breakerPass.value) return `Автомат ${activeRating.value} А меньше расчётного тока`
  if (!currentPass.value) return `Кабель ${cableSection.value} мм² не выдержит расчётный ток`
  if (!cablePass.value) return `Автомат ${activeRating.value} А не защищает кабель ${cableSection.value} мм²`
  return 'Номинал согласован с нагрузкой и кабелем'
})

usePageMeta({
  title: 'Подбор автоматического выключателя — ВОЛЬТ.ЛАБ',
  description:
    'Онлайн-подбор номинала автоматического выключателя по мощности, cosφ и характеристике B/C/D с проверкой сечения кабеля по ПУЭ.',
})

function selectRating(rating: number): void {
  selectedRating.value = selectedRating.value === rating ? null : rating
}
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-amber-300/20 blur-[100px] dark:bg-amber-400/[.05]"></div>
      <div class="container-page relative py-10 lg:py-14">
        <div class="grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <p class="eyebrow">Калькулятор 03</p>
            <h1 class="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-ink-950 sm:text-4xl lg:text-5xl dark:text-white">
              Номинал автомата
            </h1>
            <p class="mt-4 max-w-xl text-sm leading-7 text-ink-600 dark:text-cloud-400">
              Подберите защиту по расчётному току и проверьте главное неравенство:
              автомат должен защищать кабель, а не пропускать через него опасный ток.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <span class="chip chip-volt self-start"><CircuitBoard :size="12" /> Iрасч ≤ In ≤ Iкабеля</span>
            <CalculatorTabs />
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-10 lg:py-14">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        <div class="surface p-5 sm:p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-extrabold text-ink-900 dark:text-white">Нагрузка и линия</h2>
            <span class="chip">{{ curve }}</span>
          </div>

          <div class="mt-5 space-y-5">
            <div>
              <p class="field-label">Тип нагрузки</p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  v-for="kind in loadKinds"
                  :key="kind.value"
                  type="button"
                  class="rounded-lg border px-2 py-2 text-[10px] font-bold transition"
                  :class="loadKind === kind.value ? 'border-volt-500 bg-volt-400/10 text-ink-900 dark:text-white' : 'border-cloud-200 text-ink-500 dark:border-white/10 dark:text-cloud-400'"
                  @click="loadKind = kind.value"
                >
                  {{ kind.label }}
                </button>
              </div>
              <p class="mt-1.5 text-[10px] text-ink-400 dark:text-cloud-400/60">
                {{ loadKinds.find((item) => item.value === loadKind)?.description }} · кривая {{ curve }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Сеть" for-id="phase">
                <select id="phase" v-model.number="phase" class="select">
                  <option :value="1">1 фаза · 230 В</option>
                  <option :value="3">3 фазы · 400 В</option>
                </select>
              </FieldShell>
              <FieldShell label="Мощность" for-id="power" suffix="кВт">
                <input id="power" v-model.number="powerKw" type="number" min="0" step="0.1" class="input tabular" />
              </FieldShell>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="cosφ" for-id="cos">
                <input id="cos" v-model.number="cosPhi" type="number" min="0.5" max="1" step="0.01" class="input tabular" />
              </FieldShell>
              <FieldShell label="КПД" for-id="eff" suffix="%">
                <input id="eff" v-model.number="efficiency" type="number" min="50" max="100" class="input tabular" />
              </FieldShell>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Запас" for-id="reserve" suffix="%" hint="10–20%">
                <input id="reserve" v-model.number="reserve" type="number" min="0" max="100" step="5" class="input tabular" />
              </FieldShell>
              <FieldShell label="Напряжение" for-id="voltage" suffix="В">
                <input id="voltage" v-model.number="voltage" type="number" min="100" max="1000" class="input tabular" />
              </FieldShell>
            </div>

            <div class="divider"></div>

            <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">
              <Cable :size="12" /> Проверка кабеля
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Сечение" for-id="section">
                <select id="section" v-model.number="cableSection" class="select">
                  <option v-for="section in CABLE_SECTIONS" :key="section" :value="section">{{ section }} мм²</option>
                </select>
              </FieldShell>
              <FieldShell label="Материал" for-id="material">
                <select id="material" v-model="material" class="select">
                  <option v-for="(label, value) in MATERIAL_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </FieldShell>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Изоляция" for-id="insulation">
                <select id="insulation" v-model="insulation" class="select">
                  <option v-for="(label, value) in INSULATION_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </FieldShell>
              <FieldShell label="Прокладка" for-id="laying">
                <select id="laying" v-model="laying" class="select">
                  <option v-for="(label, value) in LAYING_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
              </FieldShell>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Температура" for-id="ambient" suffix="°C">
                <input id="ambient" v-model.number="ambientC" type="number" min="-10" max="60" class="input tabular" />
              </FieldShell>
              <FieldShell label="В трассе" for-id="group" suffix="каб.">
                <input id="group" v-model.number="groupCount" type="number" min="1" max="8" class="input tabular" />
              </FieldShell>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="grid gap-4 sm:grid-cols-[1.15fr_.85fr]">
            <div class="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-ink-900 p-6 text-white sm:p-7">
              <div class="absolute inset-0 bg-grid-dark bg-[size:24px_24px] opacity-45"></div>
              <div class="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-400/10 blur-[70px]"></div>
              <div class="relative">
                <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">Расчётный ток</p>
                <div class="mt-2 flex items-end gap-2">
                  <span class="font-mono text-6xl font-bold leading-none">{{ formatNumber(designCurrent, 1) }}</span>
                  <span class="mb-1 font-mono text-lg text-white/40">А</span>
                </div>
                <p class="mt-2 text-[11px] text-cloud-400">с запасом {{ reserve }}% · без запаса {{ formatNumber(current, 1) }} А</p>
                <div class="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3">
                  <div>
                    <p class="text-[9px] uppercase tracking-wider text-white/35">Рекомендуемый автомат</p>
                    <p class="mt-1 font-mono text-2xl font-bold">{{ activeRating ? `${curve}${activeRating}` : '—' }}</p>
                  </div>
                  <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                    <CircuitBoard :size="20" />
                  </span>
                </div>
              </div>
            </div>

            <div class="surface flex flex-col justify-between p-5">
              <div>
                <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">Проверка</p>
                <div class="mt-4 space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <span class="flex items-center gap-1.5 text-[10px] text-ink-500 dark:text-cloud-400"><CheckCircle2 :size="11" :class="breakerPass ? 'text-emerald-500' : 'text-rose-500'" /> In ≥ Iрасч</span>
                    <span class="font-mono text-[10px] font-bold" :class="breakerPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'">
                      {{ activeRating ?? '—' }} ≥ {{ formatNumber(designCurrent, 1) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <span class="flex items-center gap-1.5 text-[10px] text-ink-500 dark:text-cloud-400"><CheckCircle2 :size="11" :class="currentPass ? 'text-emerald-500' : 'text-rose-500'" /> Iдоп ≥ Iрасч</span>
                    <span class="font-mono text-[10px] font-bold" :class="currentPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'">
                      {{ formatNumber(ampacity.ampacity, 1) }} ≥ {{ formatNumber(designCurrent, 1) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <span class="flex items-center gap-1.5 text-[10px] text-ink-500 dark:text-cloud-400"><CheckCircle2 :size="11" :class="cablePass ? 'text-emerald-500' : 'text-rose-500'" /> Iдоп ≥ In</span>
                    <span class="font-mono text-[10px] font-bold" :class="cablePass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'">
                      {{ formatNumber(ampacity.ampacity, 1) }} ≥ {{ activeRating ?? '—' }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="mt-4 rounded-lg p-2.5" :class="allPass ? 'bg-emerald-500/10' : 'bg-amber-500/10'">
                <p class="flex items-start gap-1.5 text-[9px] font-semibold leading-4" :class="allPass ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">
                  <ShieldCheck :size="12" class="mt-0.5 shrink-0" />
                  {{ statusText }}
                </p>
              </div>
            </div>
          </div>

          <div class="surface p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-extrabold text-ink-900 dark:text-white">Стандартный ряд номиналов</h2>
                <p class="mt-0.5 text-[10px] text-ink-400 dark:text-cloud-400/60">Нажмите, чтобы проверить другой номинал</p>
              </div>
              <button
                v-if="selectedRating !== null"
                type="button"
                class="text-[10px] font-bold text-volt-700 dark:text-volt-300"
                @click="selectedRating = null"
              >
                Вернуть рекомендацию
              </button>
            </div>
            <div class="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
              <button
                v-for="rating in STANDARD_BREAKERS.slice(0, 16)"
                :key="rating"
                type="button"
                class="relative flex flex-col items-center rounded-xl border px-1 py-2.5 transition"
                :class="[
                  activeRating === rating
                    ? 'border-volt-500 bg-volt-400/15 text-volt-800 dark:text-volt-300'
                    : rating < designCurrent
                      ? 'border-cloud-200 bg-cloud-50/50 text-ink-300 dark:border-white/[.06] dark:bg-white/[.02] dark:text-cloud-400/40'
                      : 'border-cloud-200 text-ink-600 hover:border-volt-500/40 dark:border-white/10 dark:text-cloud-300',
                  rating === recommendedRating ? 'ring-1 ring-volt-500/40' : '',
                ]"
                @click="selectRating(rating)"
              >
                <span class="font-mono text-xs font-bold">{{ rating }}</span>
                <span class="mt-0.5 text-[8px] opacity-60">А</span>
                <span v-if="rating === recommendedRating" class="absolute -top-1.5 rounded-full bg-volt-400 px-1.5 text-[7px] font-extrabold uppercase text-ink-950">реком.</span>
              </button>
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cloud-200 pt-3 text-[9px] text-ink-400 dark:border-white/[.06] dark:text-cloud-400/60">
              <span class="inline-flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-volt-400"></span> выбран</span>
              <span class="inline-flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-cloud-300 dark:bg-white/20"></span> ниже расчётного тока</span>
              <span>Стандартный ряд: {{ STANDARD_BREAKERS.slice(0, 8).join(' · ') }} А</span>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="surface p-5">
              <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">
                <Gauge :size="12" /> Характеристика {{ curve }}
              </div>
              <p class="mt-3 text-[12px] leading-6 text-ink-600 dark:text-cloud-300">
                <template v-if="curve === 'B'">Мгновенное срабатывание при 3–5 × In. Для освещения и длинных линий.</template>
                <template v-else-if="curve === 'D'">Срабатывание при 10–20 × In. Для двигателей с тяжёлым пуском.</template>
                <template v-else>Срабатывание при 5–10 × In. Универсальный выбор для розеточных групп.</template>
              </p>
            </div>
            <div class="surface flex flex-col justify-between p-5">
              <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">
                <Zap :size="12" /> Следующий шаг
              </div>
              <p class="mt-3 text-[12px] font-bold text-ink-900 dark:text-white">Проверить селективность с вводом</p>
              <RouterLink to="/editor" class="link-arrow mt-3">
                Собрать в редакторе <ArrowRight :size="13" />
              </RouterLink>
            </div>
          </div>

          <div class="flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[.06] p-4">
            <Info :size="15" class="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
            <p class="text-[11px] leading-5 text-sky-800/80 dark:text-sky-200/75">
              Для двигателей также проверяют пусковой ток и время-токовую характеристику. Для
              цепей с электроникой учитывайте ток утечки и тип УЗО. Этот калькулятор даёт базовый подбор.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <RouterLink to="/calculators/cable" class="btn-secondary btn-sm">
              <Cable :size="13" /> Подробнее о кабеле
            </RouterLink>
            <RouterLink to="/calculators/current" class="btn-ghost btn-sm">
              <AlertTriangle :size="13" /> Пересчитать ток
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
