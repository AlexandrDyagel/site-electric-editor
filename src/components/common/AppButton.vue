<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    block?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, block: false, disabled: false },
)

defineEmits<{
  click: [event: MouseEvent]
}>()

const classes = computed(() => {
  const variant =
    props.variant === 'secondary'
      ? 'btn-secondary'
      : props.variant === 'ghost'
        ? 'btn-ghost'
        : props.variant === 'outline'
          ? 'btn-outline'
          : props.variant === 'danger'
            ? 'btn-danger'
            : 'btn-primary'
  const size = props.size === 'sm' ? 'btn-sm' : props.size === 'lg' ? 'btn-lg' : ''
  return [variant, size, props.block ? 'w-full' : '']
})
</script>

<template>
  <button :type="type" class="btn" :class="classes" :disabled="loading || disabled" @click="$emit('click', $event)">
    <LoaderCircle v-if="loading" :size="16" class="animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
