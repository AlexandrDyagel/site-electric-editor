<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { Cable, CircuitBoard, Gauge } from 'lucide-vue-next'

const route = useRoute()

const tabs = [
  { to: '/calculators/current', label: 'Ток по мощности', icon: Gauge },
  { to: '/calculators/cable', label: 'Сечение кабеля', icon: Cable },
  { to: '/calculators/breaker', label: 'Номинал автомата', icon: CircuitBoard },
]
</script>

<template>
  <div class="flex flex-wrap gap-1.5 rounded-2xl border border-cloud-200 bg-white/60 p-1.5 dark:border-white/[.07] dark:bg-white/[.03]">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold transition sm:text-xs"
      :class="
        route.path === tab.to
          ? 'bg-ink-900 text-white shadow-sm dark:bg-volt-400 dark:text-ink-950'
          : 'text-ink-500 hover:bg-cloud-100 hover:text-ink-900 dark:text-cloud-400 dark:hover:bg-white/[.06] dark:hover:text-white'
      "
    >
      <component :is="tab.icon" :size="13" />
      {{ tab.label }}
    </RouterLink>
  </div>
</template>
