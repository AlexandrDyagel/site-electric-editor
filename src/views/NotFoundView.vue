<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft, CircuitBoard } from 'lucide-vue-next'
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta({ title: 'Страница не найдена — ВОЛЬТ.ЛАБ' })
</script>

<template>
  <section class="container-page flex min-h-[65vh] flex-col items-center justify-center py-20 text-center">
    <div class="relative">
      <span class="font-mono text-[120px] font-bold leading-none text-cloud-200 dark:text-white/[.06]">404</span>
      <span class="absolute inset-0 flex items-center justify-center">
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl border border-volt-500/25 bg-volt-400/10 text-volt-700 dark:text-volt-300">
          <CircuitBoard :size="26" />
        </span>
      </span>
    </div>
    <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">Цепь не замкнулась</h1>
    <p class="mt-3 max-w-md text-sm leading-6 text-ink-500 dark:text-cloud-400">
      Страница не найдена: возможно, ссылка устарела. Вернитесь на главную или откройте редактор щита.
    </p>
    <div class="mt-7 flex flex-col gap-2 sm:flex-row">
      <RouterLink to="/" class="btn-primary"><ArrowLeft :size="15" /> На главную</RouterLink>
      <RouterLink to="/editor" class="btn-secondary">Открыть редактор</RouterLink>
    </div>
  </section>
</template>
