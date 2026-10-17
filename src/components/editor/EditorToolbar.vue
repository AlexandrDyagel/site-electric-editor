<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  PanelLeft,
  Pencil,
  Redo2,
  Save,
  Settings2,
  SlidersHorizontal,
  Undo2,
} from 'lucide-vue-next'
import BrandMark from '@/components/common/BrandMark.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { formatRub } from '@/utils/format'

defineProps<{
  dirty: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  'open-palette': []
  'open-inspector': []
  save: []
  export: []
  settings: []
  rename: []
}>()

const panel = usePanelStore()
const ui = useUiStore()

const status = computed(() => panel.calculation.status)
const supplyLabel = computed(
  () =>
    `${panel.project.supply.phase === 3 ? '3Ф' : '1Ф'} · ${panel.project.supply.voltage} В · ${
      panel.project.supply.mainBreaker ?? '—'
    } А`,
)

function undo(): void {
  panel.undo()
}

function redo(): void {
  panel.redo()
}

function openExport(): void {
  emit('export')
}

function notifySave(): void {
  if (panel.calculation.issues.some((issue) => issue.severity === 'error')) {
    ui.toast({
      title: 'В схеме есть ошибки',
      message: 'Проект можно сохранить, но проверьте подсвеченные линии.',
      tone: 'warning',
    })
  }
}
</script>

<template>
  <header class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/[.08] bg-ink-950 px-2.5 sm:px-3.5">
    <div class="flex min-w-0 items-center gap-2.5">
      <RouterLink to="/" class="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] font-bold text-cloud-400 transition hover:bg-white/[.05] hover:text-white md:flex" title="Вернуться на сайт">
        <ArrowLeft :size="12" />
        На сайт
      </RouterLink>
      <div class="hidden h-6 w-px bg-white/10 md:block"></div>
      <BrandMark class="hidden sm:flex" :show-tagline="false" />
      <div class="hidden h-6 w-px bg-white/10 sm:block"></div>

      <button
        type="button"
        class="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-white/[.04]"
        title="Переименовать проект"
        @click="emit('rename')"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-volt-400/20 bg-volt-400/10 text-volt-300">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M5 3.5h5.1L13 9.2l2.9-5.7H21l-6.3 11.1V20h-3.4v-5.4L5 3.5Z" fill="currentColor" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="flex items-center gap-1">
            <span class="max-w-[140px] truncate text-[12px] font-extrabold text-white sm:max-w-[240px]">{{ panel.project.name }}</span>
            <Pencil :size="10" class="shrink-0 text-cloud-400/40 transition group-hover:text-cloud-300" />
          </span>
          <span class="mt-0.5 block truncate font-mono text-[8px] text-cloud-400/50">
            {{ supplyLabel }}<span class="hidden sm:inline"> · {{ panel.componentCount }} комп. · {{ formatRub(panel.totalPrice) }}</span>
          </span>
        </span>
      </button>

      <StatusPill :status="status" size="sm" class="hidden md:inline-flex" />
    </div>

    <div class="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <div class="hidden items-center gap-1 sm:flex">
        <button
          type="button"
          class="rounded-lg p-2 text-cloud-400 transition hover:bg-white/[.06] hover:text-white disabled:opacity-25"
          :disabled="!panel.canUndo"
          aria-label="Отменить"
          title="Отменить (Ctrl+Z)"
          @click="undo"
        >
          <Undo2 :size="14" />
        </button>
        <button
          type="button"
          class="rounded-lg p-2 text-cloud-400 transition hover:bg-white/[.06] hover:text-white disabled:opacity-25"
          :disabled="!panel.canRedo"
          aria-label="Повторить"
          title="Повторить (Ctrl+Shift+Z)"
          @click="redo"
        >
          <Redo2 :size="14" />
        </button>
      </div>

      <div class="mx-0.5 hidden h-6 w-px bg-white/10 sm:block"></div>

      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold text-cloud-300 transition hover:bg-white/[.06] hover:text-white disabled:opacity-40"
        :disabled="saving"
        aria-label="Сохранить проект"
        @click="notifySave(); emit('save')"
      >
        <Check v-if="!dirty" :size="13" class="text-emerald-400" />
        <Save v-else :size="13" />
        <span class="hidden lg:inline">{{ dirty ? 'Сохранить' : 'Сохранено' }}</span>
      </button>

      <button
        type="button"
        class="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold text-cloud-300 transition hover:bg-white/[.06] hover:text-white sm:flex"
        @click="emit('settings')"
      >
        <Settings2 :size="13" />
        <span class="hidden xl:inline">Параметры</span>
      </button>

      <button type="button" class="btn-primary btn-sm !rounded-lg !px-3 !py-2" @click="openExport">
        <Download :size="13" />
        <span class="hidden sm:inline">Экспорт</span>
        <ChevronDown :size="10" class="hidden opacity-60 sm:block" />
      </button>

      <div class="mx-0.5 h-6 w-px bg-white/10 lg:hidden"></div>
      <button type="button" class="rounded-lg p-2 text-cloud-300 transition hover:bg-white/[.06] hover:text-white lg:hidden" aria-label="Библиотека" @click="emit('open-palette')">
        <PanelLeft :size="16" />
      </button>
      <button type="button" class="rounded-lg p-2 text-cloud-300 transition hover:bg-white/[.06] hover:text-white xl:hidden" aria-label="Расчёты и свойства" @click="emit('open-inspector')">
        <SlidersHorizontal :size="16" />
      </button>
    </div>
  </header>
</template>
