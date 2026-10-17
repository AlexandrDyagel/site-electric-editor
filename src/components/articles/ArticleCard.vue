<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  BookOpen,
  Cable,
  Calculator,
  CircuitBoard,
  Clock,
  PlugZap,
  ShieldCheck,
} from 'lucide-vue-next'
import type { Article } from '@/data/articles'

const props = withDefaults(
  defineProps<{
    article: Article
    feature?: boolean
  }>(),
  { feature: false },
)

const categoryIcon = computed(() => {
  if (props.article.category === 'Защита') return 'shield'
  if (props.article.category === 'Кабель') return 'cable'
  if (props.article.category === 'Схемы') return 'scheme'
  if (props.article.category === 'Заземление') return 'ground'
  return 'calc'
})
</script>

<template>
  <RouterLink
    :to="`/articles/${article.slug}`"
    class="group surface flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-volt-500/30 hover:shadow-lift dark:hover:border-volt-400/25"
  >
    <div
      class="relative overflow-hidden border-b border-cloud-200/70 px-5 pb-5 pt-6 dark:border-white/[.06]"
      :class="feature ? 'min-h-[190px]' : 'min-h-[150px]'"
    >
      <div class="absolute inset-0 bg-gradient-to-br" :class="article.accent"></div>
      <svg
        class="absolute -right-6 -top-8 h-40 w-40 text-ink-950/[.09] transition duration-500 group-hover:scale-105 dark:text-white/[.08]"
        viewBox="0 0 160 160"
        fill="none"
        aria-hidden="true"
      >
        <path d="M22 120h25V92h30V64h32V36h29" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 120h118" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" />
        <circle cx="47" cy="92" r="4" fill="currentColor" />
        <circle cx="77" cy="64" r="4" fill="currentColor" />
        <circle cx="109" cy="36" r="4" fill="currentColor" />
        <rect x="86" y="94" width="48" height="32" rx="4" stroke="currentColor" />
        <path d="M96 106h28M96 114h18" stroke="currentColor" />
      </svg>
      <div class="relative flex items-center justify-between">
        <span class="chip chip-volt !border-volt-500/25 !bg-white/70 backdrop-blur dark:!bg-white/[.06]">
          <span class="font-mono text-[9px] uppercase">{{ article.category }}</span>
        </span>
        <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500 dark:text-cloud-400">
          <Clock :size="11" />
          {{ article.readMinutes }} мин
        </span>
      </div>
      <div class="relative mt-8 flex items-end justify-between">
        <span class="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500/70 dark:text-cloud-400/60">
          VOLT.LAB / {{ String(article.readMinutes).padStart(2, '0') }}
        </span>
        <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/40 text-ink-700 backdrop-blur dark:border-white/10 dark:bg-white/[.05] dark:text-cloud-300">
          <ShieldCheck v-if="categoryIcon === 'shield'" :size="18" />
          <Cable v-else-if="categoryIcon === 'cable'" :size="18" />
          <CircuitBoard v-else-if="categoryIcon === 'scheme'" :size="18" />
          <PlugZap v-else-if="categoryIcon === 'ground'" :size="18" />
          <Calculator v-else :size="18" />
        </span>
      </div>
    </div>

    <div class="flex flex-1 flex-col p-5">
      <h3
        class="font-extrabold leading-tight tracking-[-0.025em] text-ink-900 transition group-hover:text-volt-800 dark:text-white dark:group-hover:text-volt-300"
        :class="feature ? 'text-xl sm:text-2xl' : 'text-[17px]'"
      >
        {{ article.title }}
      </h3>
      <p class="mt-3 line-clamp-3 text-[13px] leading-6 text-ink-500 dark:text-cloud-400">
        {{ article.excerpt }}
      </p>
      <div class="mt-5 flex items-center justify-between border-t border-cloud-200/70 pt-4 dark:border-white/[.06]">
        <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-cloud-400/60">
          <BookOpen :size="12" />
          Справочник
        </span>
        <span class="inline-flex items-center gap-1 text-[11px] font-bold text-ink-700 transition group-hover:text-volt-700 dark:text-cloud-300 dark:group-hover:text-volt-300">
          Читать
          <ArrowUpRight :size="13" />
        </span>
      </div>
    </div>
  </RouterLink>
</template>
