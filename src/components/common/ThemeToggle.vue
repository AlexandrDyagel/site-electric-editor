<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useUiStore } from '@/stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :aria-label="ui.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'"
    :title="ui.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
    @click="ui.toggleTheme()"
  >
    <Sun v-if="ui.theme === 'dark'" :size="17" />
    <Moon v-else :size="17" />
  </button>
</template>
