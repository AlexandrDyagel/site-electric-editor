<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
    linkLabel?: string
    linkTo?: string
    align?: 'left' | 'center'
    level?: 'h1' | 'h2'
  }>(),
  { align: 'left', level: 'h2' },
)
</script>

<template>
  <div
    class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    :class="align === 'center' ? 'text-center sm:flex-col sm:items-center' : ''"
  >
    <div :class="align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <component :is="level" class="section-title mt-3">{{ title }}</component>
      <p v-if="description" class="section-copy" :class="align === 'center' ? 'mx-auto' : ''">
        {{ description }}
      </p>
    </div>
    <slot name="actions">
      <RouterLink v-if="linkTo && linkLabel" :to="linkTo" class="link-arrow shrink-0">
        {{ linkLabel }}
        <ArrowRight :size="15" />
      </RouterLink>
    </slot>
  </div>
</template>
