<script setup lang="ts">
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    compact?: boolean
    showTagline?: boolean
  }>(),
  { compact: false, showTagline: true },
)
</script>

<template>
  <RouterLink
    to="/"
    class="group inline-flex items-center gap-2.5 text-current"
    aria-label="ВОЛЬТ.ЛАБ — на главную"
  >
    <span
      class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-volt-400/30 bg-volt-400/10 text-volt-400 transition group-hover:border-volt-400/60 group-hover:bg-volt-400/15"
    >
      <svg viewBox="0 0 24 24" class="h-[22px] w-[22px]" fill="none" aria-hidden="true">
        <path d="M5 3.5h5.1L13 9.2l2.9-5.7H21l-6.3 11.1V20h-3.4v-5.4L5 3.5Z" fill="currentColor" />
      </svg>
      <span class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-volt-400 to-transparent"></span>
    </span>
    <span v-if="!compact" class="flex flex-col leading-none">
      <span class="text-[17px] font-extrabold tracking-[-0.04em]">
        ВОЛЬТ<span class="text-volt-500 dark:text-volt-400">.ЛАБ</span>
      </span>
      <span
        v-if="showTagline"
        class="mt-1 text-[8px] font-bold uppercase tracking-[0.23em] opacity-45"
      >
        инженерная электрика
      </span>
    </span>
  </RouterLink>
</template>
