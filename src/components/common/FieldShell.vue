<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    forId?: string
    hint?: string
    error?: string
    suffix?: string
    required?: boolean
  }>(),
  { required: false },
)
</script>

<template>
  <div>
    <div class="mb-2 flex items-baseline justify-between gap-3">
      <label :for="forId" class="field-label !mb-0">
        {{ label }}
        <span v-if="required" class="text-volt-600 dark:text-volt-400">*</span>
      </label>
      <span v-if="suffix" class="text-[10px] font-semibold uppercase tracking-wider text-cloud-400">
        {{ suffix }}
      </span>
    </div>
    <slot />
    <p v-if="error" class="mt-1.5 text-[11px] font-semibold text-rose-500">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-[11px] leading-4 text-ink-400 dark:text-cloud-400/70">
      {{ hint }}
    </p>
  </div>
</template>
