<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Cable,
  Check,
  ChevronRight,
  CircuitBoard,
  Download,
  FileJson,
  Gauge,
  Layers3,
  MousePointer2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-vue-next'
import SectionHeading from '@/components/common/SectionHeading.vue'
import HeroPanel from '@/components/home/HeroPanel.vue'
import ArticleCard from '@/components/articles/ArticleCard.vue'
import { ARTICLES } from '@/data/articles'
import { useLibraryStore } from '@/stores/libraryStore'
import { usePageMeta } from '@/composables/usePageMeta'
import { CATEGORY_META } from '@/data/library'
import { CATEGORY_ORDER } from '@/config/editor'
import { NEUTRAL_COLOR, PE_GREEN, PHASE_COLORS } from '@/utils/wire'

const library = useLibraryStore()
const articles = computed(() => ARTICLES.slice(0, 3))

usePageMeta({
  title: 'ВОЛЬТ.ЛАБ — электрика, расчёты и редактор щитов',
  description:
    'Инженерный сервис для электриков: справочник по ПУЭ, калькуляторы тока и сечения, визуальный редактор сборки электрических щитов с расчётом нагрузок.',
})

const stats = [
  { value: `${library.totalCount}`, label: 'моделей оборудования' },
  { value: '3', label: 'инженерных калькулятора' },
  { value: '9', label: 'автопроверок схемы' },
  { value: '100%', label: 'данные остаются в браузере' },
]

const calculators = [
  {
    to: '/calculators/current',
    icon: Gauge,
    tag: '01 / Ток',
    title: 'Ток по мощности',
    text: 'Однофазная и трёхфазная сеть, cosφ, КПД и запас. Подскажем ближайший номинал автомата.',
    formula: 'I = P / (U × cosφ)',
  },
  {
    to: '/calculators/cable',
    icon: Cable,
    tag: '02 / Кабель',
    title: 'Сечение по ПУЭ',
    text: 'Таблица допустимых токов, поправки на температуру и группу, проверка падения напряжения.',
    formula: 'Iдоп = Iтабл × Kтемп × Kгр',
  },
  {
    to: '/calculators/breaker',
    icon: CircuitBoard,
    tag: '03 / Защита',
    title: 'Номинал автомата',
    text: 'Согласование расчётного тока, кабеля и характеристики B/C/D без запаса «на глаз».',
    formula: 'Iрасч ≤ In ≤ Iкабеля',
  },
]

const editorFeatures = [
  { icon: MousePointer2, text: 'Drag & drop оборудования на DIN-рейку' },
  { icon: SlidersHorizontal, text: 'Провода с валидацией коротких замыканий' },
  { icon: Activity, text: 'Токи, фазы и селективность в реальном времени' },
]

const workflow = [
  {
    number: '01',
    title: 'Соберите компоновку',
    text: 'Перетащите автоматы, УЗО и шины на рейки. Редактор сам уплотнит ряд и проверит занятые модули.',
  },
  {
    number: '02',
    title: 'Задайте нагрузки',
    text: 'Для каждой линии укажите мощность, cosφ, коэффициент использования и фазу. Расчёт обновится мгновенно.',
  },
  {
    number: '03',
    title: 'Проверьте и сохраните',
    text: 'Исправьте подсвеченные ошибки, выгрузите PNG, однолинейную схему, смету PDF или проект JSON.',
  },
]
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-40 dark:bg-grid-dark dark:opacity-60"></div>
      <div class="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-volt-300/20 blur-[120px] dark:bg-volt-400/[.07]"></div>
      <div class="pointer-events-none absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-sky-300/10 blur-[110px] dark:bg-sky-500/[.05]"></div>

      <div class="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:py-24 xl:gap-20">
        <div class="relative z-10">
          <div class="inline-flex items-center gap-2.5 rounded-full border border-cloud-200 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-ink-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[.04] dark:text-cloud-300">
            <span class="relative flex h-4 w-4 items-center justify-center rounded-full bg-volt-400/20">
              <span class="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-volt-500"></span>
            </span>
            Инженерный сервис · расчёты по ПУЭ
            <span class="rounded-full bg-volt-400 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-ink-950">new</span>
          </div>

          <h1 class="mt-6 text-[42px] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink-950 sm:text-6xl lg:text-[66px] xl:text-[72px] dark:text-white">
            Щит, который<br />
            сходится
            <span class="relative inline-block whitespace-nowrap text-volt-700 dark:text-volt-300">
              по расчёту
              <svg class="absolute -bottom-2 left-0 w-full text-volt-500/70" viewBox="0 0 300 14" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 9c58-7 109-7 157-3 50 3 91 1 139-4" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
              </svg>
            </span><span class="text-volt-700 dark:text-volt-300">.</span>
          </h1>

          <p class="mt-7 max-w-xl text-[15px] leading-7 text-ink-600 sm:text-[17px] sm:leading-8 dark:text-cloud-400">
            Визуальный редактор электрических щитов, который считает нагрузку, токи по фазам
            и проверяет защиту — пока вы собираете схему. Без таблиц, ручных пересчётов и
            «примерно подходит».
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <RouterLink to="/editor" class="btn-primary btn-lg group">
              <Zap :size="18" class="transition group-hover:rotate-6" />
              Собрать щит в редакторе
              <ArrowRight :size="16" class="transition group-hover:translate-x-0.5" />
            </RouterLink>
            <RouterLink to="/calculators" class="btn-secondary btn-lg">
              Открыть калькуляторы
              <ArrowUpRight :size="16" />
            </RouterLink>
          </div>

          <p class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-ink-400 dark:text-cloud-400/70">
            <span class="inline-flex items-center gap-1.5"><Check :size="12" class="text-volt-600" /> без регистрации</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="12" class="text-volt-600" /> бесплатный демо-проект</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="12" class="text-volt-600" /> данные не покидают браузер</span>
          </p>

          <div class="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 border-t border-cloud-200 pt-6 sm:grid-cols-4 dark:border-white/[.07]">
            <div v-for="stat in stats" :key="stat.label">
              <p class="font-mono text-xl font-bold tracking-tight text-ink-900 dark:text-white">
                {{ stat.value }}
              </p>
              <p class="mt-1 text-[10px] font-semibold leading-4 text-ink-400 dark:text-cloud-400/60">
                {{ stat.label }}
              </p>
            </div>
          </div>
        </div>

        <div class="relative z-10 mx-auto w-full max-w-[600px] lg:mx-0">
          <HeroPanel />
        </div>
      </div>
    </section>

    <!-- BRANDS -->
    <section class="border-b border-cloud-200/70 bg-white/40 py-6 dark:border-white/[.06] dark:bg-white/[.015]">
      <div class="container-page flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-400 dark:text-cloud-400/50">
          Работает с оборудованием
        </p>
        <div class="flex flex-wrap items-center gap-x-8 gap-y-3">
          <span v-for="brand in ['ABB', 'Schneider Electric', 'Legrand', 'IEK', 'Hager']" :key="brand" class="text-sm font-extrabold tracking-tight text-ink-400/70 transition hover:text-ink-600 dark:text-cloud-400/40 dark:hover:text-cloud-300">
            {{ brand }}
          </span>
        </div>
      </div>
    </section>

    <!-- EDITOR FEATURE -->
    <section class="container-page py-20 lg:py-28">
      <SectionHeading
        eyebrow="Главный модуль"
        title="Один холст вместо пяти таблиц"
        description="Перетаскивайте модули, соединяйте клеммы и наблюдайте, как схема оживает: инженерные проверки идут параллельно сборке."
      >
        <template #actions>
          <RouterLink to="/editor" class="btn-secondary">
            Открыть демо-щит
            <ArrowUpRight :size="15" />
          </RouterLink>
        </template>
      </SectionHeading>

      <div class="mt-10 grid gap-4 lg:grid-cols-12">
        <div class="surface relative overflow-hidden p-5 sm:p-7 lg:col-span-7">
          <div class="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-volt-300/20 blur-3xl dark:bg-volt-400/[.06]"></div>
          <div class="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-volt-700 dark:text-volt-300">01 / Visual editor</span>
              <h3 class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-ink-900 dark:text-white">
                Схема собирается руками,<br class="hidden sm:block" />
                проверяется движком
              </h3>
            </div>
            <span class="chip chip-volt"><Sparkles :size="12" /> real-time</span>
          </div>

          <div class="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink-950 p-3 shadow-2xl">
            <div class="mb-2 flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.03] px-3 py-2">
              <div class="flex items-center gap-2 font-mono text-[9px] text-white/40">
                <span class="h-1.5 w-1.5 rounded-full bg-volt-400"></span>
                PANEL / КВАРТИРА 3Ф
              </div>
              <span class="font-mono text-[9px] text-emerald-300">● 6 линий</span>
            </div>
            <div class="grid grid-cols-16 gap-[3px] rounded-md bg-black/30 p-2">
              <div v-for="n in 16" :key="`a-${n}`" class="col-span-2 flex h-12 flex-col justify-between rounded-[3px] border border-white/10 bg-white/[.055] p-1.5">
                <span class="font-mono text-[7px] text-white/40">QF</span>
                <span class="font-mono text-[9px] font-bold text-white/80">C{{ [16, 16, 10, 16, 6, 16, 20, 25][n - 1] ?? 16 }}</span>
              </div>
            </div>
            <div class="relative my-1 h-1.5 rounded-sm bg-gradient-to-b from-slate-500/50 to-slate-700/20"></div>
            <div class="grid grid-cols-16 gap-[3px] rounded-md bg-black/30 p-2">
              <div class="col-span-4 flex h-12 items-center justify-center rounded-[3px] border border-sky-400/20 bg-sky-400/10 font-mono text-[10px] font-bold text-sky-200">N BUS</div>
              <div class="col-span-4 flex h-12 items-center justify-center rounded-[3px] border border-volt-400/20 bg-volt-400/10 font-mono text-[10px] font-bold text-volt-200">PE BUS</div>
              <div class="col-span-2 flex h-12 items-center justify-center rounded-[3px] border border-white/10 bg-white/[.04] font-mono text-[10px] text-white/60">РН</div>
              <div class="col-span-6 flex h-12 items-center justify-between rounded-[3px] border border-white/[.07] bg-white/[.02] px-2.5">
                <span class="font-mono text-[9px] text-white/35">СВОБОДНО</span>
                <span class="font-mono text-[9px] text-volt-300">+ 3 мод.</span>
              </div>
            </div>
            <svg class="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-50" viewBox="0 0 700 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M190 20v18c0 12 10 18 22 18h150c12 0 22 6 22 18v12" :stroke="NEUTRAL_COLOR" stroke-width="1.4" fill="none" />
              <path d="M330 20v10c0 14 12 20 26 20h132c14 0 26 8 26 22v14" :stroke="PE_GREEN" stroke-width="1.4" fill="none" />
              <path d="M450 20v40c0 14 12 22 26 22h100" :stroke="PHASE_COLORS.L1" stroke-width="1.4" fill="none" />
            </svg>
          </div>

          <div class="mt-5 grid gap-2 sm:grid-cols-3">
            <div v-for="feature in editorFeatures" :key="feature.text" class="flex items-start gap-2 rounded-xl border border-cloud-200/70 bg-cloud-50/60 p-3 dark:border-white/[.06] dark:bg-white/[.02]">
              <component :is="feature.icon" :size="14" class="mt-0.5 shrink-0 text-volt-700 dark:text-volt-300" />
              <span class="text-[11px] font-semibold leading-5 text-ink-600 dark:text-cloud-300">{{ feature.text }}</span>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:col-span-5">
          <div class="surface relative overflow-hidden p-5 sm:p-6">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-volt-700 dark:text-volt-300">02 / Расчётный движок</span>
              <Activity :size="16" class="text-volt-600 dark:text-volt-400" />
            </div>
            <h3 class="mt-2 text-xl font-extrabold text-ink-900 dark:text-white">Нагрузка видна сразу</h3>
            <p class="mt-2 text-[12px] leading-6 text-ink-500 dark:text-cloud-400">
              Токи по фазам, перекос, загрузка автоматов и утечки пересчитываются при каждом изменении.
            </p>
            <div class="mt-5 space-y-3">
              <div v-for="phase in [
                { name: 'L1', value: 78, current: '14,7 А', color: PHASE_COLORS.L1 },
                { name: 'L2', value: 86, current: '15,6 А', color: PHASE_COLORS.L2 },
                { name: 'L3', value: 74, current: '15,0 А', color: PHASE_COLORS.L3 },
              ]" :key="phase.name" class="flex items-center gap-3">
                <span class="w-5 font-mono text-[10px] font-bold text-ink-500 dark:text-cloud-400">{{ phase.name }}</span>
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-cloud-200 dark:bg-white/[.07]">
                  <div class="h-full rounded-full transition-all duration-700" :style="{ width: `${phase.value}%`, backgroundColor: phase.color }"></div>
                </div>
                <span class="w-12 text-right font-mono text-[10px] font-semibold text-ink-600 dark:text-cloud-300">{{ phase.current }}</span>
              </div>
            </div>
            <div class="mt-5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] px-3 py-2.5">
              <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck :size="14" /> Перекос фаз 6,8%
              </span>
              <span class="font-mono text-[9px] uppercase tracking-wider text-emerald-600/60 dark:text-emerald-300/50">норма</span>
            </div>
          </div>

          <div class="surface relative overflow-hidden bg-ink-900 p-5 text-white sm:p-6 dark:bg-ink-850">
            <div class="absolute inset-0 bg-grid-dark bg-[size:22px_22px] opacity-40"></div>
            <div class="relative">
              <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-volt-300">03 / Экспорт</span>
              <h3 class="mt-2 text-xl font-extrabold">Забирайте результат</h3>
              <div class="mt-4 grid grid-cols-2 gap-2">
                <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-2">
                  <Download :size="13" class="text-volt-300" />
                  <span class="font-mono text-[9px] text-white/70">PNG / SVG</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-2">
                  <FileJson :size="13" class="text-sky-300" />
                  <span class="font-mono text-[9px] text-white/70">JSON</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-2">
                  <Layers3 :size="13" class="text-amber-300" />
                  <span class="font-mono text-[9px] text-white/70">PDF-смета</span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-2">
                  <BookOpen :size="13" class="text-emerald-300" />
                  <span class="font-mono text-[9px] text-white/70">CSV</span>
                </div>
              </div>
              <RouterLink to="/editor" class="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-volt-300 hover:text-volt-200">
                Посмотреть в редакторе <ArrowUpRight :size="13" />
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CALCULATORS -->
    <section class="relative overflow-hidden bg-ink-900 py-20 text-white lg:py-28">
      <div class="absolute inset-0 bg-grid-dark bg-[size:34px_34px] opacity-50"></div>
      <div class="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-volt-400/10 blur-[110px]"></div>
      <div class="container-page relative">
        <SectionHeading
          eyebrow="Быстрые расчёты"
          title="Три калькулятора, которые всегда под рукой"
          description="Проверьте линию за минуту. Формулы, поправки ПУЭ и стандартные ряды уже внутри — остаётся подставить значения."
        >
          <template #actions>
            <RouterLink to="/calculators" class="inline-flex items-center gap-1.5 text-sm font-bold text-volt-300 hover:text-volt-200">
              Все калькуляторы <ArrowUpRight :size="15" />
            </RouterLink>
          </template>
        </SectionHeading>

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <RouterLink
            v-for="(calc, index) in calculators"
            :key="calc.to"
            :to="calc.to"
            class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-volt-400/35 hover:bg-white/[.055]"
          >
            <div class="flex items-center justify-between">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-volt-400/20 bg-volt-400/10 text-volt-300">
                <component :is="calc.icon" :size="18" />
              </span>
              <span class="font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">{{ calc.tag }}</span>
            </div>
            <h3 class="mt-5 text-xl font-extrabold">{{ calc.title }}</h3>
            <p class="mt-2 min-h-[66px] text-[12px] leading-6 text-cloud-400">{{ calc.text }}</p>
            <div class="mt-4 rounded-lg border border-white/[.07] bg-black/20 px-3 py-2 font-mono text-[10px] text-volt-300/80">
              {{ calc.formula }}
            </div>
            <div class="mt-4 flex items-center justify-between text-[11px] font-bold text-white/60 group-hover:text-white">
              Рассчитать
              <span class="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 transition group-hover:border-volt-400/40 group-hover:bg-volt-400/10">
                <ChevronRight :size="13" />
              </span>
            </div>
            <span class="absolute right-4 top-4 font-mono text-[42px] font-bold leading-none text-white/[.025]">0{{ index + 1 }}</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- WORKFLOW -->
    <section class="container-page py-20 lg:py-28">
      <div class="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
        <div class="lg:sticky lg:top-28">
          <p class="eyebrow">Как это работает</p>
          <h2 class="section-title mt-3">От идеи до спецификации — один маршрут</h2>
          <p class="section-copy">
            Не нужно переключаться между таблицами, CAD и Excel. Схема, проверка и смета живут в одном проекте.
          </p>
          <RouterLink to="/editor" class="btn-primary mt-7">
            Начать с демо-проекта
            <ArrowRight :size="15" />
          </RouterLink>
          <div class="mt-8 flex items-center gap-3 rounded-2xl border border-cloud-200 bg-white/60 p-3.5 dark:border-white/[.07] dark:bg-white/[.025]">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-volt-400/15 text-volt-700 dark:text-volt-300">
              <Layers3 :size="16" />
            </span>
            <p class="text-[11px] leading-5 text-ink-500 dark:text-cloud-400">
              <span class="font-bold text-ink-700 dark:text-cloud-200">Смета без Excel.</span>
              Спецификация собирается из установленного оборудования автоматически.
            </p>
          </div>
        </div>

        <div class="relative">
          <div class="absolute bottom-6 left-[23px] top-6 w-px bg-gradient-to-b from-volt-400/60 via-cloud-300 to-transparent dark:via-white/10"></div>
          <div class="space-y-4">
            <div
              v-for="step in workflow"
              :key="step.number"
              class="group relative flex gap-4 rounded-2xl border border-cloud-200 bg-white/60 p-5 transition hover:border-volt-500/30 dark:border-white/[.07] dark:bg-white/[.025] dark:hover:border-volt-400/20"
            >
              <span class="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-volt-500/25 bg-cloud-50 font-mono text-xs font-bold text-volt-700 dark:border-volt-400/20 dark:bg-ink-900 dark:text-volt-300">
                {{ step.number }}
              </span>
              <div class="pt-0.5">
                <h3 class="text-base font-extrabold text-ink-900 dark:text-white">{{ step.title }}</h3>
                <p class="mt-1.5 text-[12px] leading-6 text-ink-500 dark:text-cloud-400">{{ step.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- LIBRARY -->
    <section class="border-y border-cloud-200/70 bg-white/40 py-16 dark:border-white/[.06] dark:bg-white/[.015] lg:py-20">
      <div class="container-page">
        <div class="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p class="eyebrow">Библиотека</p>
            <h2 class="mt-3 text-3xl font-extrabold text-ink-900 sm:text-4xl dark:text-white">
              {{ library.totalCount }} моделей.<br />
              Всё, что нужно для щита.
            </h2>
            <p class="mt-4 max-w-md text-sm leading-7 text-ink-500 dark:text-cloud-400">
              Автоматы 1P–4P с кривыми B/C/D, УЗО, дифавтоматы, реле, счётчики, шины и аксессуары.
              Цены и характеристики можно использовать в смете.
            </p>
            <RouterLink to="/editor" class="link-arrow mt-5">
              Посмотреть библиотеку в редакторе <ArrowUpRight :size="14" />
            </RouterLink>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div v-for="category in CATEGORY_ORDER.slice(0, 8)" :key="category" class="rounded-2xl border border-cloud-200 bg-white/70 p-4 dark:border-white/[.07] dark:bg-white/[.025]">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-volt-400/10 text-volt-700 dark:text-volt-300">
                <Layers3 :size="14" />
              </span>
              <p class="mt-3 text-[11px] font-extrabold leading-4 text-ink-800 dark:text-cloud-200">
                {{ CATEGORY_META[category].short }}
              </p>
              <p class="mt-1 font-mono text-[10px] text-ink-400 dark:text-cloud-400/50">
                {{ library.byCategory.get(category)?.length ?? 0 }} поз.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ARTICLES -->
    <section class="container-page py-20 lg:py-28">
      <SectionHeading
        eyebrow="Справочник"
        title="Разобраться, а не угадать"
        description="Практические материалы по защите, кабелям и схемам — без воды и пересказа учебника."
        link-label="Все статьи"
        link-to="/articles"
      />
      <div class="mt-10 grid gap-4 md:grid-cols-3">
        <ArticleCard v-for="article in articles" :key="article.slug" :article="article" />
      </div>
    </section>

    <!-- CTA -->
    <section class="container-page pb-20 lg:pb-28">
      <div class="relative overflow-hidden rounded-[28px] border border-volt-500/20 bg-ink-900 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
        <div class="absolute inset-0 bg-grid-dark bg-[size:30px_30px] opacity-50"></div>
        <div class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-volt-400/20 blur-[100px]"></div>
        <div class="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-sky-400/10 blur-[80px]"></div>
        <div class="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div class="max-w-xl">
            <div class="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-volt-300">
              <Zap :size="13" /> следующий щит — здесь
            </div>
            <h2 class="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.04em] sm:text-4xl">
              Соберите схему,<br class="sm:hidden" /> которая проходит проверку.
            </h2>
            <p class="mt-3 max-w-lg text-sm leading-7 text-cloud-400">
              Демо-проект уже собран и рассчитан. Откройте его, поменяйте линию или добавьте
              оборудование — все проверки обновятся мгновенно.
            </p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <RouterLink to="/editor" class="btn-primary btn-lg">
              Открыть редактор <ArrowRight :size="16" />
            </RouterLink>
            <RouterLink to="/projects" class="btn-secondary btn-lg !border-white/15 !bg-white/[.06] !text-white hover:!bg-white/[.1]">
              Мои проекты
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
