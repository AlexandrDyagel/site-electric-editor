<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  Cable,
  CheckCircle2,
  CircuitBoard,
  Gauge,
  Info,
  Sparkles,
  Zap,
} from 'lucide-vue-next'
import { selectCableSection, selectStandardBreaker } from '@/data/pue'
import { usePageMeta } from '@/composables/usePageMeta'
import CalculatorTabs from '@/components/calculators/CalculatorTabs.vue'
import { formatNumber } from '@/utils/format'
import FieldShell from '@/components/common/FieldShell.vue'

const phase = ref<1 | 3>(1)
const voltage = ref(230)
const powerKw = ref(5.5)
const cosPhi = ref(0.95)
const efficiency = ref(100)
const reserve = ref(10)

watch(phase, (next) => {
  voltage.value = next === 1 ? 230 : 400
})

const safe = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))

const result = computed(() => {
  const p = Math.max(0, Number(powerKw.value) || 0) * 1000
  const cos = safe(Number(cosPhi.value) || 0.95, 0.1, 1)
  const eff = safe(Number(efficiency.value) || 100, 50, 100) / 100
  const u = safe(Number(voltage.value) || (phase.value === 1 ? 230 : 400), 100, 1000)
  const current =
    phase.value === 1 ? p / (u * cos * eff) : p / (Math.sqrt(3) * u * cos * eff)
  const designCurrent = current * (1 + safe(Number(reserve.value) || 0, 0, 100) / 100)
  const apparent = p / (cos * eff) / 1000
  const active = p / eff / 1000
  const reactive = Math.sqrt(Math.max(0, apparent ** 2 - active ** 2))
  const breaker = selectStandardBreaker(designCurrent, 1)
  const cable = selectCableSection(designCurrent, {
    material: 'copper',
    insulation: 'pvc',
    laying: 'conduit',
    ambientC: 25,
    groupCount: 1,
  })
  return {
    current,
    designCurrent,
    apparent,
    active,
    reactive,
    breaker,
    cable,
    loadPct: breaker ? Math.min(100, (designCurrent / breaker) * 100) : 0,
  }
})

const gaugeStyle = computed(() => ({
  background: `conic-gradient(#bdfa45 ${Math.min(360, (result.value.loadPct / 100) * 360)}deg, rgba(255,255,255,.08) 0deg)`,
}))

const cableLabel = computed(() =>
  result.value.cable
    ? `${result.value.cable.section} мм² · ${formatNumber(result.value.cable.ampacity, 1)} А`
    : '—',
)

usePageMeta({
  title: 'Расчёт тока по мощности — ВОЛЬТ.ЛАБ',
  description:
    'Онлайн-калькулятор тока по мощности для однофазной и трёхфазной сети с учётом cosφ и КПД. Рекомендация номинала автомата и сечения кабеля.',
})
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-volt-300/20 blur-[100px] dark:bg-volt-400/[.06]"></div>
      <div class="container-page relative py-10 lg:py-14">
        <div class="grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <p class="eyebrow">Калькулятор 01</p>
            <h1 class="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-ink-950 sm:text-4xl lg:text-5xl dark:text-white">
              Ток по мощности
            </h1>
            <p class="mt-4 max-w-xl text-sm leading-7 text-ink-600 dark:text-cloud-400">
              Переведите мощность нагрузки в расчётный ток. Учитываются сеть, cosφ, КПД и
              технологический запас — на выходе ближайший номинал автомата и сечение кабеля.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <span class="chip chip-volt self-start"><Gauge :size="12" /> I = P / (U × cosφ)</span>
            <CalculatorTabs />
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-10 lg:py-14">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        <div class="surface p-5 sm:p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-extrabold text-ink-900 dark:text-white">Исходные данные</h2>
            <span class="chip">I, А</span>
          </div>

          <div class="mt-5 space-y-5">
            <div>
              <p class="field-label">Сеть</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="rounded-xl border px-3 py-3 text-left transition"
                  :class="phase === 1 ? 'border-volt-500 bg-volt-400/10' : 'border-cloud-200 hover:border-cloud-300 dark:border-white/10'"
                  @click="phase = 1"
                >
                  <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Однофазная</span>
                  <span class="mt-0.5 block font-mono text-[10px] text-ink-400 dark:text-cloud-400/60">230 В · L + N</span>
                </button>
                <button
                  type="button"
                  class="rounded-xl border px-3 py-3 text-left transition"
                  :class="phase === 3 ? 'border-volt-500 bg-volt-400/10' : 'border-cloud-200 hover:border-cloud-300 dark:border-white/10'"
                  @click="phase = 3"
                >
                  <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Трёхфазная</span>
                  <span class="mt-0.5 block font-mono text-[10px] text-ink-400 dark:text-cloud-400/60">400 В · L1/L2/L3</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="Мощность" for-id="power" suffix="кВт" required>
                <input id="power" v-model.number="powerKw" type="number" min="0" step="0.1" class="input tabular" />
              </FieldShell>
              <FieldShell label="Напряжение" for-id="voltage" suffix="В" required>
                <input id="voltage" v-model.number="voltage" type="number" min="100" max="1000" step="10" class="input tabular" />
              </FieldShell>
            </div>

            <FieldShell label="cosφ" for-id="cosphi" :hint="`${formatNumber(cosPhi, 2)} — коэффициент мощности`" required>
              <div class="flex items-center gap-3">
                <input v-model.number="cosPhi" type="range" min="0.5" max="1" step="0.01" aria-label="Коэффициент мощности" />
                <input id="cosphi" v-model.number="cosPhi" type="number" min="0.5" max="1" step="0.01" class="input !w-20 tabular" />
              </div>
            </FieldShell>

            <div class="grid grid-cols-2 gap-3">
              <FieldShell label="КПД" for-id="efficiency" suffix="%" hint="100% для активной нагрузки">
                <input id="efficiency" v-model.number="efficiency" type="number" min="50" max="100" step="1" class="input tabular" />
              </FieldShell>
              <FieldShell label="Запас" for-id="reserve" suffix="%" hint="Рекомендуется 10–20%">
                <input id="reserve" v-model.number="reserve" type="number" min="0" max="100" step="5" class="input tabular" />
              </FieldShell>
            </div>

            <div class="rounded-xl border border-sky-500/20 bg-sky-500/[.06] p-3">
              <p class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                <Info :size="12" /> Для справки
              </p>
              <p class="mt-1.5 text-[11px] leading-5 text-sky-800/75 dark:text-sky-200/70">
                Для трёхфазной нагрузки ток считается по линейному напряжению. Для однофазной —
                по фазному 230 В.
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900 p-6 text-white shadow-panel sm:p-8">
            <div class="absolute inset-0 bg-grid-dark bg-[size:26px_26px] opacity-50"></div>
            <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-volt-400/15 blur-[80px]"></div>
            <div class="relative">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-volt-300">Расчётный ток</p>
                  <div class="mt-2 flex items-end gap-2">
                    <span class="font-mono text-5xl font-bold tracking-tight sm:text-6xl">{{ formatNumber(result.designCurrent, 1) }}</span>
                    <span class="mb-2 font-mono text-lg text-white/40">А</span>
                  </div>
                  <p class="mt-2 text-[11px] text-cloud-400">
                    без запаса: <span class="font-mono text-white/80">{{ formatNumber(result.current, 1) }} А</span>
                  </p>
                </div>
                <div class="relative flex h-28 w-28 items-center justify-center rounded-full" :style="gaugeStyle">
                  <div class="absolute inset-[7px] rounded-full bg-ink-900"></div>
                  <div class="relative text-center">
                    <p class="font-mono text-xl font-bold">{{ formatNumber(result.loadPct, 0) }}%</p>
                    <p class="text-[8px] uppercase tracking-wider text-white/35">загрузка</p>
                  </div>
                </div>
              </div>

              <div class="mt-7 grid gap-3 sm:grid-cols-3">
                <div class="rounded-xl border border-white/[.07] bg-white/[.03] p-3">
                  <p class="text-[9px] uppercase tracking-wider text-white/35">Полная мощность</p>
                  <p class="mt-1 font-mono text-sm font-bold">{{ formatNumber(result.apparent, 2) }} кВА</p>
                </div>
                <div class="rounded-xl border border-white/[.07] bg-white/[.03] p-3">
                  <p class="text-[9px] uppercase tracking-wider text-white/35">Активная</p>
                  <p class="mt-1 font-mono text-sm font-bold">{{ formatNumber(result.active, 2) }} кВт</p>
                </div>
                <div class="rounded-xl border border-white/[.07] bg-white/[.03] p-3">
                  <p class="text-[9px] uppercase tracking-wider text-white/35">Реактивная</p>
                  <p class="mt-1 font-mono text-sm font-bold">{{ formatNumber(result.reactive, 2) }} квар</p>
                </div>
              </div>

              <div class="mt-5 rounded-2xl border border-volt-400/20 bg-volt-400/[.06] p-4">
                <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-volt-300">
                  <Sparkles :size="13" /> Рекомендация
                </div>
                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  <div class="flex items-center gap-3">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-volt-300">
                      <CircuitBoard :size="16" />
                    </span>
                    <div>
                      <p class="text-[9px] uppercase tracking-wider text-white/35">Автомат</p>
                      <p class="font-mono text-sm font-bold">
                        {{ result.breaker ? `C${result.breaker} А` : 'вне ряда' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-volt-300">
                      <Cable :size="16" />
                    </span>
                    <div>
                      <p class="text-[9px] uppercase tracking-wider text-white/35">Кабель, медь</p>
                      <p class="font-mono text-sm font-bold">{{ cableLabel }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="surface p-5">
              <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">Формула</p>
              <p class="mt-3 font-mono text-sm font-semibold text-ink-800 dark:text-cloud-200">
                {{ phase === 1 ? 'I = P / (U × cosφ × η)' : 'I = P / (√3 × U × cosφ × η)' }}
              </p>
              <p class="mt-2 text-[11px] leading-5 text-ink-400 dark:text-cloud-400/60">
                P — Вт, U — В, η — КПД. Запас добавляется к расчётному току до подбора номинала.
              </p>
            </div>
            <div class="surface flex flex-col justify-between p-5">
              <div>
                <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/60">Следующий шаг</p>
                <p class="mt-3 text-sm font-bold text-ink-900 dark:text-white">Проверить сечение по ПУЭ</p>
                <p class="mt-1 text-[11px] leading-5 text-ink-400 dark:text-cloud-400/60">С поправками на температуру и группу.</p>
              </div>
              <RouterLink to="/calculators/cable" class="link-arrow mt-4">
                К расчёту кабеля <ArrowRight :size="14" />
              </RouterLink>
            </div>
          </div>

          <div class="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4">
            <CheckCircle2 :size="16" class="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p class="text-[11px] leading-5 text-emerald-800/80 dark:text-emerald-200/75">
              Автомат выбран из стандартного ряда и проверен по расчётному току с запасом.
              Сечение кабеля предварительное: точный выбор зависит от способа прокладки.
            </p>
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <div v-for="item in [
          { icon: Zap, title: 'Активная нагрузка', text: 'ТЭН, лампа накаливания, нагреватель: cosφ ≈ 1, КПД 100%.' },
          { icon: Gauge, title: 'Реактивная нагрузка', text: 'Двигатель, компрессор, инвертор: cosφ 0,8–0,95, учитывайте пуск.' },
          { icon: CircuitBoard, title: 'Что дальше', text: 'Проверьте селективность с вводным автоматом и утечку для УЗО.' },
        ]" :key="item.title" class="surface flex gap-3 p-4">
          <component :is="item.icon" :size="16" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
          <div>
            <p class="text-[12px] font-extrabold text-ink-900 dark:text-white">{{ item.title }}</p>
            <p class="mt-1 text-[11px] leading-5 text-ink-500 dark:text-cloud-400">{{ item.text }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
