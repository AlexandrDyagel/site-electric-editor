<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Download,
  Eraser,
  FilePlus2,
  PanelLeft,
  Pencil,
  Redo2,
  Save,
  Settings2,
  SlidersHorizontal,
  Undo2,
} from 'lucide-vue-next'
import BrandMark from '@/components/common/BrandMark.vue'
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
  'open-checks': []
  'new-project': []
  'clear-panel': []
  save: []
  export: []
  settings: []
  rename: []
}>()

const panel = usePanelStore()
const ui = useUiStore()

const status = computed(() => panel.calculation.status)
const checkIssues = computed(() =>
  panel.calculation.issues.filter((issue) => issue.severity === 'error' || issue.severity === 'warning'),
)
const checkCount = computed(() => checkIssues.value.length)
const checkSummary = computed(() => checkIssues.value.slice(0, 3))
const checkButtonClass = computed(() => {
  if (status.value === 'error') return 'border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15'
  if (status.value === 'warning') return 'border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
})
const checkTooltip = computed(() => {
  if (checkCount.value === 0) return 'Проверки схемы: замечаний нет'
  return `Проверки схемы: ${checkCount.value}. ${checkIssues.value.slice(0, 2).map((issue) => issue.title).join('; ')}`
})
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
            <span class="max-w-[120px] truncate text-[12px] font-extrabold text-white sm:max-w-[200px]">{{ panel.project.name }}</span>
            <Pencil :size="10" class="shrink-0 text-cloud-400/40 transition group-hover:text-cloud-300" />
          </span>
          <span class="mt-0.5 block truncate font-mono text-[8px] text-cloud-400/50">
            {{ supplyLabel }}<span class="hidden sm:inline"> · {{ panel.componentCount }} комп. · {{ formatRub(panel.totalPrice) }}</span>
          </span>
        </span>
      </button>

      <div class="hidden items-center gap-0.5 border-l border-white/[.08] pl-2 md:flex">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-bold text-cloud-300 transition hover:bg-white/[.06] hover:text-white"
          title="Новый проект"
          aria-label="Новый проект"
          @click="emit('new-project')"
        >
          <FilePlus2 :size="13" class="text-volt-300" />
          <span class="hidden xl:inline">Новый проект</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-bold text-cloud-300 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-35"
          :disabled="panel.componentCount === 0 && panel.wireCount === 0"
          title="Очистить щит"
          aria-label="Очистить щит"
          @click="emit('clear-panel')"
        >
          <Eraser :size="13" />
          <span class="hidden xl:inline">Очистить щит</span>
        </button>
      </div>

      <div class="group relative hidden lg:block">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold transition"
          :class="checkButtonClass"
          :title="checkTooltip"
          :aria-label="`${checkTooltip}. Открыть раздел проверок`"
          @click="emit('open-checks')"
        >
          <CheckCircle2 v-if="status === 'ok'" :size="12" />
          <AlertTriangle v-else-if="status === 'warning'" :size="12" />
          <CircleAlert v-else :size="12" />
          Проверки
          <span
            v-if="checkCount > 0"
            class="min-w-[16px] rounded-full bg-black/20 px-1 text-center font-mono text-[8px] leading-4"
          >
            {{ checkCount }}
          </span>
          <ChevronRight :size="10" class="opacity-50" />
        </button>

        <div
          class="invisible pointer-events-none absolute left-0 top-full z-[140] mt-2 w-[310px] translate-y-1 rounded-xl border border-white/10 bg-ink-850 p-3 text-cloud-100 opacity-0 shadow-2xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
          role="tooltip"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-extrabold uppercase tracking-[0.13em] text-cloud-400/60">
              Проверки схемы
            </p>
            <span
              class="rounded-full px-2 py-0.5 font-mono text-[8px] font-bold"
              :class="checkCount ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'"
            >
              {{ checkCount ? `${checkCount} замеч.` : 'норма' }}
            </span>
          </div>

          <div v-if="checkCount" class="mt-2.5 space-y-2">
            <div v-for="(issue, index) in checkSummary" :key="issue.code + '-' + index" class="flex items-start gap-2">
              <span
                class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                :class="issue.severity === 'error' ? 'bg-rose-400' : 'bg-amber-400'"
              ></span>
              <div class="min-w-0">
                <p class="text-[10px] font-bold text-cloud-100">{{ issue.title }}</p>
                <p class="mt-0.5 line-clamp-2 text-[9px] leading-4 text-cloud-400/70">{{ issue.message }}</p>
              </div>
            </div>
            <p v-if="checkCount > 3" class="pl-3.5 text-[9px] text-cloud-400/50">
              Ещё {{ checkCount - 3 }}…
            </p>
          </div>
          <p v-else class="mt-2.5 text-[10px] leading-5 text-cloud-400/70">
            Нагрузки, кабели и защиты согласованы. Замечаний нет.
          </p>

          <div class="mt-2.5 flex items-center justify-between border-t border-white/[.07] pt-2 text-[9px] font-bold text-volt-300">
            Открыть раздел «Проверки»
            <ChevronRight :size="11" />
          </div>
        </div>
      </div>
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
