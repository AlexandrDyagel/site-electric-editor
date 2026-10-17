<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Cable,
  Check,
  ClipboardCheck,
  Clock3,
  Cpu,
  FileCheck2,
  Gauge,
  Layers3,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-vue-next'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({
  title: 'Услуги по проектированию и сборке щитов — ВОЛЬТ.ЛАБ',
  description:
    'Проектирование, аудит и сборка электрических щитов. Расчёт нагрузок, подбор защит, однолинейные схемы и спецификации.',
})

const services = [
  {
    icon: Layers3,
    title: 'Проектирование щита',
    text: 'Компоновка, однолинейная схема, расчёт нагрузок и селективности. От квартиры до небольшого производства.',
    tags: ['схема', 'расчёт', 'спецификация'],
  },
  {
    icon: Wrench,
    title: 'Сборка и монтаж',
    text: 'Аккуратная сборка по проекту, маркировка, протяжка и испытания. С фотоотчётом каждого этапа.',
    tags: ['монтаж', 'маркировка', 'испытания'],
  },
  {
    icon: ClipboardCheck,
    title: 'Аудит существующего щита',
    text: 'Тепловизионная проверка, поиск перегруза, ошибок заземления и неселективных защит. Отчёт с приоритетами.',
    tags: ['аудит', 'Тепловизор', 'отчёт'],
  },
  {
    icon: Cpu,
    title: 'Автоматизация и диспетчеризация',
    text: 'Учёт электроэнергии, контроль перекоса фаз, реле и контроллеры с передачей данных.',
    tags: ['IoT', 'учёт', 'мониторинг'],
  },
  {
    icon: Cable,
    title: 'Подбор кабелей и защит',
    text: 'Согласование номиналов, проверка падения напряжения и температуры. Для нового строительства и реконструкции.',
    tags: ['ПУЭ', 'кабель', 'защита'],
  },
  {
    icon: Gauge,
    title: 'Инженерная консультация',
    text: 'Разбор схемы, проверка чужого проекта или помощь с выбором оборудования под задачу.',
    tags: ['онлайн', '60 минут', 'разбор'],
  },
]

const process = [
  { icon: Mail, title: 'Заявка', text: 'Присылаете план, мощности или фото текущего щита.' },
  { icon: FileCheck2, title: 'Расчёт', text: 'Считаем нагрузки, готовим схему и предварительную смету.' },
  { icon: Wrench, title: 'Сборка', text: 'Согласовываем оборудование, собираем и испытываем.' },
  { icon: BadgeCheck, title: 'Передача', text: 'Отдаём схему, спецификацию, фото и рекомендации.' },
]

const pricing = [
  {
    name: 'Аудит',
    price: '4 900 ₽',
    note: 'за один щит',
    features: ['Визуальный осмотр', 'Тепловизионная проверка', 'Отчёт с ошибками', 'Рекомендации по приоритетам'],
    cta: 'Заказать аудит',
    featured: false,
  },
  {
    name: 'Проект щита',
    price: '12 900 ₽',
    note: 'квартира до 12 линий',
    features: ['Расчёт нагрузок и фаз', 'Однолинейная схема', 'Подбор защит и кабелей', 'Спецификация PDF', 'Консультация 60 минут'],
    cta: 'Обсудить проект',
    featured: true,
  },
  {
    name: 'Под ключ',
    price: 'от 39 000 ₽',
    note: 'проект + сборка',
    features: ['Проект и согласование', 'Сборка и маркировка', 'Испытания и фотоотчёт', 'Выезд и подключение', 'Гарантия 12 месяцев'],
    cta: 'Рассчитать стоимость',
    featured: false,
  },
]

const faq = [
  {
    question: 'Можно ли заказать только схему, без сборки?',
    answer: 'Да. Проект передаётся в PDF и редактируемом формате: однолинейная схема, спецификация, компоновка щита и расчёт нагрузок. По нему может собрать любой электромонтажник.',
  },
  {
    question: 'Работаете с трёхфазными щитами?',
    answer: 'Да, включая распределение однофазных нагрузок по фазам, контроль перекоса, селективность и УЗО. Для промышленных объектов расчёт выполняется с учётом пусковых токов.',
  },
  {
    question: 'Насколько точна смета?',
    answer: 'Предварительная смета формируется по выбранной линейке оборудования. После согласования бренда и серии фиксируем стоимость. Если цена оборудования меняется — предупреждаем до закупки.',
  },
  {
    question: 'Что входит в аудит?',
    answer: 'Осмотр щита, проверка маркировки и соединений, тепловизионная съёмка под нагрузкой, анализ селективности и заземления. На выходе — отчёт с дефектами и планом исправлений.',
  },
]
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -right-32 -top-20 h-96 w-96 rounded-full bg-volt-300/25 blur-[110px] dark:bg-volt-400/[.08]"></div>
      <div class="container-page relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-24">
        <div>
          <p class="eyebrow">Инженерные услуги</p>
          <h1 class="mt-4 text-4xl font-extrabold leading-[1.03] tracking-[-0.055em] text-ink-950 sm:text-5xl lg:text-[64px] dark:text-white">
            Щиты, которые<br />
            не стыдно открыть.
          </h1>
          <p class="mt-6 max-w-xl text-[15px] leading-7 text-ink-600 sm:text-base dark:text-cloud-400">
            Проектируем и собираем щиты с прозрачной логикой: каждый автомат обоснован,
            каждый проводник подписан, каждая защита проверена расчётом.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="mailto:hello@voltlab.ru" class="btn-primary btn-lg">
              Обсудить задачу
              <ArrowUpRight :size="16" />
            </a>
            <a href="tel:+74951234567" class="btn-secondary btn-lg">
              <Phone :size="16" /> +7 (495) 123-45-67
            </a>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div v-for="item in [
            { value: '12+', label: 'лет инженерного опыта', icon: Clock3 },
            { value: '480+', label: 'собранных щитов', icon: Wrench },
            { value: '0', label: 'скрытых ошибок в отчёте', icon: ShieldCheck },
            { value: '12', label: 'месяцев гарантии', icon: BadgeCheck },
          ]" :key="item.label" class="rounded-2xl border border-cloud-200 bg-white/65 p-5 backdrop-blur dark:border-white/[.07] dark:bg-white/[.03]">
            <component :is="item.icon" :size="17" class="text-volt-700 dark:text-volt-300" />
            <p class="mt-4 font-mono text-2xl font-bold text-ink-950 dark:text-white">{{ item.value }}</p>
            <p class="mt-1 text-[10px] font-semibold leading-4 text-ink-400 dark:text-cloud-400/60">{{ item.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-20 lg:py-24">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-2xl">
          <p class="eyebrow">Что делаем</p>
          <h2 class="section-title mt-3">От расчёта до подписанного щита</h2>
          <p class="section-copy">
            Можно взять отдельный этап или весь цикл. В любом случае на выходе — понятная документация и схема,
            которую сможет обслуживать другой инженер.
          </p>
        </div>
        <RouterLink to="/editor" class="btn-outline shrink-0">
          <Sparkles :size="15" /> Попробовать расчёт
        </RouterLink>
      </div>

      <div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="service in services" :key="service.title" class="surface group p-6 transition duration-300 hover:-translate-y-1 hover:border-volt-500/30">
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-volt-400/12 text-volt-700 transition group-hover:bg-volt-400/20 dark:text-volt-300">
            <component :is="service.icon" :size="20" />
          </span>
          <h3 class="mt-5 text-lg font-extrabold text-ink-900 dark:text-white">{{ service.title }}</h3>
          <p class="mt-2 text-[12px] leading-6 text-ink-500 dark:text-cloud-400">{{ service.text }}</p>
          <div class="mt-4 flex flex-wrap gap-1.5">
            <span v-for="tag in service.tags" :key="tag" class="rounded-full border border-cloud-200 px-2 py-0.5 text-[9px] font-semibold text-ink-400 dark:border-white/[.08] dark:text-cloud-400/70">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="relative overflow-hidden bg-ink-900 py-20 text-white lg:py-24">
      <div class="absolute inset-0 bg-grid-dark bg-[size:34px_34px] opacity-40"></div>
      <div class="container-page relative">
        <div class="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-volt-300">Процесс</p>
            <h2 class="mt-3 text-3xl font-extrabold sm:text-4xl">Прозрачно на каждом шаге</h2>
            <p class="mt-4 max-w-md text-sm leading-7 text-cloud-400">
              Вы видите схему и смету до начала работ. Любое изменение фиксируется в проекте.
            </p>
            <RouterLink to="/projects" class="mt-7 inline-flex items-center gap-2 text-sm font-bold text-volt-300 hover:text-volt-200">
              Посмотреть пример проекта <ArrowUpRight :size="15" />
            </RouterLink>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="(step, index) in process" :key="step.title" class="relative rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <span class="font-mono text-[9px] text-white/25">0{{ index + 1 }}</span>
              <component :is="step.icon" :size="18" class="mt-4 text-volt-300" />
              <h3 class="mt-3 text-sm font-extrabold">{{ step.title }}</h3>
              <p class="mt-1 text-[11px] leading-5 text-cloud-400">{{ step.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page py-20 lg:py-24">
      <div class="text-center">
        <p class="eyebrow">Стоимость</p>
        <h2 class="section-title mt-3">Понятные пакеты</h2>
        <p class="section-copy mx-auto text-center">
          Финальная цена зависит от числа линий, бренда оборудования и состояния объекта.
        </p>
      </div>

      <div class="mt-10 grid gap-4 lg:grid-cols-3">
        <div
          v-for="plan in pricing"
          :key="plan.name"
          class="surface relative flex flex-col p-6"
          :class="plan.featured ? 'border-volt-500/40 shadow-glow lg:-translate-y-2' : ''"
        >
          <span v-if="plan.featured" class="absolute -top-3 left-6 rounded-full bg-volt-400 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-ink-950">
            популярный
          </span>
          <p class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400 dark:text-cloud-400/60">{{ plan.name }}</p>
          <p class="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">{{ plan.price }}</p>
          <p class="mt-1 text-[10px] text-ink-400 dark:text-cloud-400/60">{{ plan.note }}</p>
          <ul class="mt-6 flex-1 space-y-2.5 border-t border-cloud-200 pt-5 dark:border-white/[.07]">
            <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2 text-[12px] text-ink-600 dark:text-cloud-300">
              <Check :size="14" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              {{ feature }}
            </li>
          </ul>
          <a
            href="mailto:hello@voltlab.ru"
            class="mt-6 w-full"
            :class="plan.featured ? 'btn-primary' : 'btn-secondary'"
          >
            {{ plan.cta }}
            <ArrowRight :size="14" />
          </a>
        </div>
      </div>
      <p class="mt-5 text-center text-[10px] text-ink-400 dark:text-cloud-400/50">
        Цены указаны для примера и не являются публичной офертой. Точная стоимость — после уточнения задачи.
      </p>
    </section>

    <section class="border-t border-cloud-200/70 bg-white/40 py-20 dark:border-white/[.06] dark:bg-white/[.015] lg:py-24">
      <div class="container-page grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p class="eyebrow">Вопросы</p>
          <h2 class="section-title mt-3">Коротко о главном</h2>
          <p class="section-copy">Не нашли ответ? Напишите — ответим по существу, без брифинга на час.</p>
          <a href="mailto:hello@voltlab.ru" class="btn-secondary mt-6">
            <Mail :size="15" /> Задать вопрос
          </a>
        </div>
        <div class="space-y-2.5">
          <details
            v-for="(item, index) in faq"
            :key="item.question"
            class="group rounded-2xl border border-cloud-200 bg-white/65 px-5 py-4 dark:border-white/[.07] dark:bg-white/[.025]"
            :open="index === 0"
          >
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-ink-800 marker:hidden dark:text-cloud-200">
              {{ item.question }}
              <span class="text-volt-600 transition group-open:rotate-45 dark:text-volt-400">
                <Zap :size="15" />
              </span>
            </summary>
            <p class="mt-3 border-t border-cloud-200/70 pt-3 text-[12px] leading-6 text-ink-500 dark:border-white/[.06] dark:text-cloud-400">
              {{ item.answer }}
            </p>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>
