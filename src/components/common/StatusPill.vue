<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-vue-next'
import type { Severity } from '@/types'

const props = withDefaults(
  defineProps<{
    status: Severity
    label?: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' },
)

const text = computed(() => {
  if (props.label) return props.label
  if (props.status === 'ok') return 'Норма'
  if (props.status === 'warning') return 'Внимание'
  return 'Ошибка'
})

const classes = computed(() => {
  if (props.status === 'ok') return 'status-ok border-emerald-500/25'
  if (props.status === 'warning') return 'status-warning border-amber-500/25'
  return 'status-error border-rose-500/25'
})

const iconSize = computed(() => (props.size === 'sm' ? 12 : 14))
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
    :class="[classes, size === 'sm' ? 'px-2 py-0.5 text-[10px]' : '']"
  >
    <CheckCircle2 v-if="status === 'ok'" :size="iconSize" aria-hidden="true" />
    <AlertTriangle v-else-if="status === 'warning'" :size="iconSize" aria-hidden="true" />
    <CircleAlert v-else :size="iconSize" aria-hidden="true" />
    {{ text }}
  </span>
</template>
