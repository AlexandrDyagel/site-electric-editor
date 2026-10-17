<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnBackdrop?: boolean
  }>(),
  { size: 'md', closeOnBackdrop: true },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const widthClass = computed(() => {
  if (props.size === 'sm') return 'max-w-md'
  if (props.size === 'lg') return 'max-w-2xl'
  if (props.size === 'xl') return 'max-w-4xl'
  return 'max-w-lg'
})

function close(): void {
  emit('update:modelValue', false)
}

function onBackdrop(): void {
  if (props.closeOnBackdrop) close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        role="presentation"
        @mousedown.self="onBackdrop"
      >
        <div
          class="surface max-h-[92vh] w-full overflow-hidden rounded-b-none sm:rounded-3xl"
          :class="widthClass"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header class="flex items-start justify-between gap-4 border-b border-cloud-200 px-5 py-4 dark:border-white/[.07] sm:px-6">
            <div>
              <h2 class="text-lg font-extrabold text-ink-900 dark:text-white">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-xs leading-5 text-ink-500 dark:text-cloud-400">
                {{ description }}
              </p>
            </div>
            <button type="button" class="icon-btn !h-9 !w-9 shrink-0" aria-label="Закрыть" @click="close">
              <X :size="16" />
            </button>
          </header>
          <div class="scroll-thin max-h-[calc(92vh-140px)] overflow-y-auto px-5 py-5 sm:px-6">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex flex-wrap items-center justify-end gap-2 border-t border-cloud-200 bg-cloud-50/60 px-5 py-4 dark:border-white/[.07] dark:bg-white/[.02] sm:px-6"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
