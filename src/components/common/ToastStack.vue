<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useUiStore } from '@/stores/uiStore'

const ui = useUiStore()

const toneClasses: Record<string, string> = {
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  error: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-5 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:right-6"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-3 opacity-0"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="translate-x-4 opacity-0"
      >
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="pointer-events-none flex items-start gap-3 rounded-2xl border bg-white/95 p-3.5 shadow-lift backdrop-blur-xl dark:bg-ink-850/95"
          :class="toneClasses[toast.tone]"
          role="status"
        >
          <CheckCircle2 v-if="toast.tone === 'success'" :size="18" class="mt-0.5 shrink-0" />
          <XCircle v-else-if="toast.tone === 'error'" :size="18" class="mt-0.5 shrink-0" />
          <AlertTriangle v-else-if="toast.tone === 'warning'" :size="18" class="mt-0.5 shrink-0" />
          <Info v-else :size="18" class="mt-0.5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-extrabold leading-5">{{ toast.title }}</p>
            <p v-if="toast.message" class="mt-0.5 text-[11px] leading-5 opacity-80">
              {{ toast.message }}
            </p>
          </div>
          <button
            type="button"
            class="pointer-events-auto rounded-md p-1 opacity-50 transition hover:opacity-100"
            aria-label="Скрыть уведомление"
            @click="ui.dismissToast(toast.id)"
          >
            <X :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
