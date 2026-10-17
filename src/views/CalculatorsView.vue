<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Cable,
  CircuitBoard,
  Gauge,
  ShieldCheck,
  Zap,
} from 'lucide-vue-next'
import { AMPACITY_TABLE } from '@/data/pue'
import { usePageMeta } from '@/composables/usePageMeta'
import CalculatorTabs from '@/components/calculators/CalculatorTabs.vue'

usePageMeta({
  title: 'Калькуляторы электрика — ВОЛЬТ.ЛАБ',
  description:
    'Расчёт тока по мощности, подбор сечения кабеля по ПУЭ и выбор номинала автоматического выключателя. Онлайн-калькуляторы с формулами и поправками.',
})

const calculators = [
  {
    to: '/calculators/current',
    icon: Gauge,
    index: '01',
    title: 'Расчёт тока по мощности',
    description:
      'Переведите мощность в ток для однофазной или трёхфазной сети. Учитываются cosφ, КПД и запас.',
    bullets: ['Однофазная и трёхфазная сеть', 'cosφ и КПД', 'Ближайший номинал автомата'],
    formula: 'I = P / (U × cosφ)',
  },
  {
    to: '/calculators/cable',
    icon: Cable,
    index: '02',
    title: 'Подбор сечения кабеля',
    description:
      'Таблица ПУЭ с поправками на температуру, группу кабелей и способ прокладки. Проверка падения напряжения.',
    bullets: ['Медь и алюминий', 'ПВХ и XLPE', 'ΔU для длины линии'],
    formula: 'Iдоп = Iтабл × Kтемп × Kгр',
  },
  {
    to: '/calculators/breaker',
    icon: CircuitBoard,
    index: '03',
    title: 'Подбор автомата',
    description:
      'Согласуйте расчётный ток, номинал и сечение кабеля. Получите рекомендацию по характеристике B/C/D.',
    bullets: ['Стандартный ряд 6–250 А', 'Проверка кабеля', 'Кривая срабатывания'],
    formula: 'Iрасч ≤ In ≤ Iкабеля',
  },
]
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-volt-300/20 blur-[100px] dark:bg-volt-400/[.07]"></div>
      <div class="container-page relative py-14 lg:py-20">
        <div class="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <p class="eyebrow">Инженерные калькуляторы</p>
            <h1 class="mt-4 text-4xl font-extrabold leading-[1.04] tracking-[-0.05em] text-ink-950 sm:text-5xl lg:text-[60px] dark:text-white">
              Считать,<br class="sm:hidden" /> а не прикидывать.
            </h1>
            <p class="mt-5 max-w-xl text-[15px] leading-7 text-ink-600 sm:text-base dark:text-cloud-400">
              Три инструмента для ежедневной работы. С формулами, стандартными рядами и
              поправками, которые обычно забывают.
            </p>
          </div>
          <div class="relative overflow-hidden rounded-2xl border border-cloud-200 bg-white/60 p-5 dark:border-white/[.07] dark:bg-white/[.03]">
            <div class="absolute inset-0 bg-grid-light bg-[size:22px_22px] opacity-30 dark:bg-grid-dark"></div>
            <div class="relative">
              <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-volt-700 dark:text-volt-300">
                <ShieldCheck :size="13" /> Проверено по ПУЭ
              </div>
              <p class="mt-4 font-mono text-sm leading-7 text-ink-600 dark:text-cloud-300">
                Iрасч ≤ In ≤ Iдоп<br />
                <span class="text-volt-600 dark:text-volt-400">40 А ≥ 16 А ≤ 27 А</span>
              </p>
              <p class="mt-3 text-[10px] leading-5 text-ink-400 dark:text-cloud-400/60">
                Калькуляторы дают предварительный результат. Перед монтажом проверьте исходные данные.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-8 max-w-2xl">
          <CalculatorTabs />
        </div>
      </div>
    </section>

    <section class="container-page py-16 lg:py-20">
      <div class="grid gap-4 lg:grid-cols-3">
        <RouterLink
          v-for="calc in calculators"
          :key="calc.to"
          :to="calc.to"
          class="surface group relative flex flex-col overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:border-volt-500/30 hover:shadow-lift"
        >
          <div class="flex items-center justify-between">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-volt-400/12 text-volt-700 transition group-hover:bg-volt-400/20 dark:text-volt-300">
              <component :is="calc.icon" :size="22" />
            </span>
            <span class="font-mono text-[10px] text-ink-300 dark:text-white/20">{{ calc.index }}</span>
          </div>
          <h2 class="mt-6 text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">{{ calc.title }}</h2>
          <p class="mt-2.5 text-[12px] leading-6 text-ink-500 dark:text-cloud-400">{{ calc.description }}</p>
          <ul class="mt-5 space-y-2">
            <li v-for="bullet in calc.bullets" :key="bullet" class="flex items-center gap-2 text-[11px] font-medium text-ink-600 dark:text-cloud-300">
              <span class="h-1 w-1 rounded-full bg-volt-500"></span>
              {{ bullet }}
            </li>
          </ul>
          <div class="mt-auto flex items-center justify-between border-t border-cloud-200 pt-4 dark:border-white/[.07]">
            <span class="font-mono text-[10px] text-ink-400 dark:text-cloud-400/60">{{ calc.formula }}</span>
            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-volt-700 dark:text-volt-300">
              Открыть <ArrowUpRight :size="13" />
            </span>
          </div>
        </RouterLink>
      </div>

      <div class="mt-12 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div class="surface overflow-hidden">
          <div class="flex items-center justify-between border-b border-cloud-200 px-5 py-4 dark:border-white/[.07]">
            <div>
              <p class="text-sm font-extrabold text-ink-900 dark:text-white">Базовые токи для меди</p>
              <p class="mt-0.5 text-[10px] text-ink-400 dark:text-cloud-400/60">Одиночный кабель, воздух 30 °C, ПВХ</p>
            </div>
            <span class="chip">ПУЭ 1.3</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[520px] text-left text-[11px]">
              <thead class="bg-cloud-50 text-[9px] uppercase tracking-wider text-ink-400 dark:bg-white/[.02] dark:text-cloud-400/60">
                <tr>
                  <th class="px-5 py-2.5 font-extrabold">Сечение</th>
                  <th class="px-5 py-2.5 font-extrabold">ПВХ, А</th>
                  <th class="px-5 py-2.5 font-extrabold">XLPE, А</th>
                  <th class="px-5 py-2.5 font-extrabold">Типичная защита</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in AMPACITY_TABLE.slice(0, 7)" :key="row.section" class="border-t border-cloud-200/70 dark:border-white/[.05]">
                  <td class="px-5 py-2.5 font-mono font-bold text-ink-800 dark:text-cloud-200">{{ row.section }} мм²</td>
                  <td class="px-5 py-2.5 font-mono text-ink-600 dark:text-cloud-400">{{ row.copperPvc }}</td>
                  <td class="px-5 py-2.5 font-mono text-ink-600 dark:text-cloud-400">{{ row.copperXlpe }}</td>
                  <td class="px-5 py-2.5 text-ink-500 dark:text-cloud-400">
                    {{ row.section <= 1.5 ? 'C6–C10' : row.section <= 2.5 ? 'C16' : row.section <= 4 ? 'C25' : row.section <= 6 ? 'C32' : row.section <= 10 ? 'C40–C50' : 'C63' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border-t border-cloud-200 px-5 py-3 dark:border-white/[.07]">
            <RouterLink to="/calculators/cable" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-volt-700 dark:text-volt-300">
              Полный расчёт с поправками <ArrowRight :size="12" />
            </RouterLink>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-3xl border border-volt-500/20 bg-ink-900 p-6 text-white">
          <div class="absolute inset-0 bg-grid-dark bg-[size:24px_24px] opacity-40"></div>
          <div class="relative flex h-full flex-col justify-between">
            <div>
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-volt-400/15 text-volt-300">
                <BookOpen :size="16" />
              </span>
              <h2 class="mt-4 text-xl font-extrabold">Нужна методика, а не только число?</h2>
              <p class="mt-2 text-[12px] leading-6 text-cloud-400">
                В справочнике разобраны выбор автомата, селективность, перекос фаз и ошибки заземления.
              </p>
            </div>
            <RouterLink to="/articles" class="mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-volt-300">
              Читать статьи <ArrowUpRight :size="13" />
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-4">
        <Zap :size="15" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p class="text-[11px] leading-5 text-amber-800 dark:text-amber-200/80">
          Результаты носят справочный характер и не заменяют проект. Для ответственных объектов
          учитывайте ток КЗ, термическую стойкость, условия прокладки и требования местных нормативов.
        </p>
      </div>
    </section>
  </div>
</template>
