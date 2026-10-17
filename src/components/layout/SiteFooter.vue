<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-vue-next'
import BrandMark from '@/components/common/BrandMark.vue'

const year = new Date().getFullYear()

const sections = [
  {
    title: 'Сервис',
    links: [
      { label: 'Главная', to: '/' },
      { label: 'Услуги', to: '/services' },
      { label: 'Проекты', to: '/projects' },
      { label: 'Редактор щита', to: '/editor' },
    ],
  },
  {
    title: 'Инженеру',
    links: [
      { label: 'Статьи и справочники', to: '/articles' },
      { label: 'Расчёт тока', to: '/calculators/current' },
      { label: 'Сечение кабеля', to: '/calculators/cable' },
      { label: 'Подбор автомата', to: '/calculators/breaker' },
    ],
  },
]
</script>

<template>
  <footer class="border-t border-cloud-200 bg-white/60 dark:border-white/[.06] dark:bg-ink-950">
    <div class="container-page py-14 lg:py-16">
      <div class="grid gap-10 lg:grid-cols-[1.45fr_1fr_1fr_1.1fr]">
        <div>
          <BrandMark />
          <p class="mt-5 max-w-xs text-sm leading-6 text-ink-500 dark:text-cloud-400">
            Инженерный сервис для электриков: расчёты по ПУЭ, справочные материалы и визуальный
            редактор сборки щитов.
          </p>
          <div class="mt-5 inline-flex items-center gap-2 rounded-full border border-volt-500/20 bg-volt-400/10 px-3 py-1.5 text-[11px] font-bold text-volt-800 dark:text-volt-300">
            <span class="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-volt-400"></span>
            Расчёты работают офлайн
          </div>
        </div>

        <div v-for="section in sections" :key="section.title">
          <h3 class="text-[11px] font-extrabold uppercase tracking-[0.17em] text-ink-400 dark:text-cloud-400/60">
            {{ section.title }}
          </h3>
          <ul class="mt-4 space-y-2.5">
            <li v-for="link in section.links" :key="link.to">
              <RouterLink
                :to="link.to"
                class="text-sm font-medium text-ink-600 transition hover:text-volt-700 dark:text-cloud-400 dark:hover:text-volt-300"
              >
                {{ link.label }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-[11px] font-extrabold uppercase tracking-[0.17em] text-ink-400 dark:text-cloud-400/60">
            Контакты
          </h3>
          <ul class="mt-4 space-y-3 text-sm text-ink-600 dark:text-cloud-400">
            <li class="flex items-start gap-2.5">
              <Phone :size="15" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              <a href="tel:+74951234567" class="transition hover:text-volt-700 dark:hover:text-volt-300">
                +7 (495) 123-45-67
              </a>
            </li>
            <li class="flex items-start gap-2.5">
              <Mail :size="15" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              <a href="mailto:hello@voltlab.ru" class="transition hover:text-volt-700 dark:hover:text-volt-300">
                hello@voltlab.ru
              </a>
            </li>
            <li class="flex items-start gap-2.5">
              <MapPin :size="15" class="mt-0.5 shrink-0 text-volt-600 dark:text-volt-400" />
              Москва, ул. Электрозаводская, 21
            </li>
          </ul>
          <RouterLink to="/editor" class="mt-5 inline-flex items-center gap-1 text-xs font-bold text-volt-700 dark:text-volt-300">
            Собрать щит онлайн
            <ArrowUpRight :size="13" />
          </RouterLink>
        </div>
      </div>

      <div class="mt-12 rounded-2xl border border-cloud-200 bg-cloud-50 px-4 py-3 text-[11px] leading-5 text-ink-400 dark:border-white/[.06] dark:bg-white/[.025] dark:text-cloud-400/60">
        Расчётные модули носят справочный характер и не заменяют проектную документацию.
        Перед монтажом проверьте параметры по действующим редакциям ПУЭ и документации производителя.
      </div>

      <div class="mt-8 flex flex-col gap-3 border-t border-cloud-200 pt-6 text-[11px] text-ink-400 dark:border-white/[.06] dark:text-cloud-400/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {{ year }} ВОЛЬТ.ЛАБ. Инженерная электрика.</p>
        <div class="flex gap-4">
          <span>ПУЭ 7-е издание</span>
          <span>ГОСТ 32396-2013</span>
          <span>Сделано для электриков</span>
        </div>
      </div>
    </div>
  </footer>
</template>
