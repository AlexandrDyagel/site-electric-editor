import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ToastMessage } from '@/types'
import { createUid } from '@/utils/id'

export type ThemeMode = 'dark' | 'light'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>('dark')
  const mobileMenuOpen = ref(false)
  const paletteOpen = ref(false)
  const inspectorOpen = ref(false)
  /** id оборудования, которое сейчас перетаскивают из библиотеки на холст. */
  const draggedDefId = ref<string | null>(null)
  const toasts = ref<ToastMessage[]>([])
  let toastCounter = 0

  function applyTheme(): void {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
    document.documentElement.style.colorScheme = theme.value
    localStorage.setItem('voltlab.theme', theme.value)
  }

  function initializeTheme(): void {
    try {
      const stored = localStorage.getItem('voltlab.theme')
      if (stored === 'dark' || stored === 'light') {
        theme.value = stored
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        theme.value = 'light'
      }
    } catch {
      theme.value = 'dark'
    }
    applyTheme()
  }

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme()
  }

  function toast(input: Omit<ToastMessage, 'id'>, duration = 4200): void {
    const id = createUid('toast')
    toasts.value.push({ ...input, id })
    toastCounter += 1
    if (toastCounter > 12) {
      toasts.value = toasts.value.slice(-8)
    }
    window.setTimeout(() => dismissToast(id), duration)
  }

  function dismissToast(id: string): void {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  const isDark = computed(() => theme.value === 'dark')

  return {
    theme,
    isDark,
    mobileMenuOpen,
    paletteOpen,
    inspectorOpen,
    draggedDefId,
    toasts,
    initializeTheme,
    toggleTheme,
    toast,
    dismissToast,
  }
})
