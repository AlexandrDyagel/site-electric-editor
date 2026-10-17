<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  CheckCircle2,
  Download,
  FileCode2,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-vue-next'
import ModalPanel from '@/components/common/ModalPanel.vue'
import { usePanelStore } from '@/stores/panelStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useUiStore } from '@/stores/uiStore'
import {
  exportCanvasPng,
  exportCanvasSvg,
  exportProjectJson,
  exportSingleLineSvg,
  exportSpecificationCsv,
  exportSpecificationPdf,
} from '@/services/exportService'
import { formatRub } from '@/utils/format'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: []
}>()

const panel = usePanelStore()
const projects = useProjectsStore()
const ui = useUiStore()
const busy = ref<string | null>(null)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const spec = computed(() => panel.specification)
const total = computed(() => panel.totalPrice)

function getSvg(): SVGSVGElement | null {
  const element = document.getElementById('panel-canvas-svg')
  return element instanceof SVGSVGElement ? element : null
}

function finish(title: string, message?: string): void {
  ui.toast({ title, message, tone: 'success' })
}

async function run(key: string, action: () => Promise<void> | void, successTitle: string): Promise<void> {
  if (busy.value) return
  error.value = ''
  busy.value = key
  try {
    await action()
    finish(successTitle)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Неизвестная ошибка экспорта'
    error.value = message
    ui.toast({ title: 'Ошибка экспорта', message, tone: 'error' })
  } finally {
    busy.value = null
  }
}

async function withoutSelection<T>(action: () => Promise<T> | T): Promise<T> {
  const componentUid = panel.selectedComponentUid
  const wireUid = panel.selectedWireUid
  panel.clearSelection()
  await nextTick()
  try {
    return await action()
  } finally {
    if (componentUid) panel.selectedComponentUid = componentUid
    if (wireUid) panel.selectedWireUid = wireUid
  }
}

function svgExport(): Promise<void> {
  const svg = getSvg()
  if (!svg) return Promise.reject(new Error('Холст ещё не готов'))
  return withoutSelection(() => {
    exportCanvasSvg(svg, panel.project)
  })
}

function pngExport(): Promise<void> {
  const svg = getSvg()
  if (!svg) return Promise.reject(new Error('Холст ещё не готов'))
  return withoutSelection(() => exportCanvasPng(svg, panel.project))
}

function singleLine(): void {
  exportSingleLineSvg(panel.project, panel.calculation)
}

function pdf(): Promise<void> {
  return exportSpecificationPdf(panel.project, panel.calculation)
}

function csv(): void {
  exportSpecificationCsv(panel.project, panel.calculation)
}

function json(): void {
  exportProjectJson(panel.project)
}

function openFileDialog(): void {
  fileInput.value?.click()
}

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.json')) {
    error.value = 'Выберите файл проекта .json'
    return
  }
  try {
    const text = await file.text()
    const raw: unknown = JSON.parse(text)
    const result = panel.importProject(raw)
    if (!result.ok) {
      error.value = result.message
      return
    }
    projects.save(panel.project)
    panel.markSaved()
    emit('imported')
    emit('update:modelValue', false)
    ui.toast({ title: 'Проект импортирован', message: result.message, tone: 'success' })
  } catch {
    error.value = 'Не удалось прочитать JSON. Проверьте файл.'
  }
}
</script>

<template>
  <ModalPanel
    :model-value="modelValue"
    title="Экспорт и импорт"
    description="Схема, однолинейка, смета и резервная копия проекта."
    size="xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div>
        <div class="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            class="group flex items-start gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition hover:border-volt-500/40 hover:bg-volt-400/[.04] disabled:opacity-50 dark:border-white/[.08]"
            :disabled="Boolean(busy)"
            @click="run('png', pngExport, 'PNG сохранён')"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-volt-400/10 text-volt-700 dark:text-volt-300">
              <LoaderCircle v-if="busy === 'png'" :size="17" class="animate-spin" />
              <FileImage v-else :size="17" />
            </span>
            <span>
              <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Схема в PNG</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Растровое изображение ×2 для отчёта</span>
            </span>
          </button>

          <button
            type="button"
            class="group flex items-start gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition hover:border-volt-500/40 hover:bg-volt-400/[.04] disabled:opacity-50 dark:border-white/[.08]"
            :disabled="Boolean(busy)"
            @click="run('svg', svgExport, 'SVG сохранён')"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <FileCode2 :size="17" />
            </span>
            <span>
              <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Схема в SVG</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Векторный файл без потери качества</span>
            </span>
          </button>

          <button
            type="button"
            class="group flex items-start gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition hover:border-volt-500/40 hover:bg-volt-400/[.04] disabled:opacity-50 dark:border-white/[.08]"
            :disabled="Boolean(busy)"
            @click="run('single', singleLine, 'Однолинейка сохранена')"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Zap :size="17" />
            </span>
            <span>
              <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Однолинейная схема</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Упрощённая схема для согласования</span>
            </span>
          </button>

          <button
            type="button"
            class="group flex items-start gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition hover:border-volt-500/40 hover:bg-volt-400/[.04] disabled:opacity-50 dark:border-white/[.08]"
            :disabled="Boolean(busy)"
            @click="run('pdf', pdf, 'PDF-смета сформирована')"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300">
              <LoaderCircle v-if="busy === 'pdf'" :size="17" class="animate-spin" />
              <FileText v-else :size="17" />
            </span>
            <span>
              <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Смета в PDF</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Спецификация и итоговая стоимость</span>
            </span>
          </button>

          <button
            type="button"
            class="group flex items-start gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition hover:border-volt-500/40 hover:bg-volt-400/[.04] disabled:opacity-50 dark:border-white/[.08]"
            :disabled="Boolean(busy)"
            @click="run('csv', csv, 'CSV сохранён')"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <FileSpreadsheet :size="17" />
            </span>
            <span>
              <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Смета в CSV</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Для Excel и закупки оборудования</span>
            </span>
          </button>

          <button
            type="button"
            class="group flex items-start gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition hover:border-volt-500/40 hover:bg-volt-400/[.04] disabled:opacity-50 dark:border-white/[.08]"
            :disabled="Boolean(busy)"
            @click="run('json', json, 'JSON проекта сохранён')"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <FileJson :size="17" />
            </span>
            <span>
              <span class="block text-xs font-extrabold text-ink-900 dark:text-white">Резервная копия JSON</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Для переноса и шаринга проекта</span>
            </span>
          </button>
        </div>

        <div class="mt-4 rounded-xl border border-cloud-200 p-4 dark:border-white/[.08]">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-start gap-2.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-volt-300 dark:bg-white/[.06]">
                <Upload :size="15" />
              </span>
              <div>
                <p class="text-xs font-extrabold text-ink-900 dark:text-white">Импорт проекта</p>
                <p class="mt-0.5 text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">
                  JSON заменит текущую схему. Сохраните резервную копию, если она нужна.
                </p>
              </div>
            </div>
            <button type="button" class="btn-secondary btn-sm shrink-0" @click="openFileDialog">
              <Upload :size="12" /> Выбрать файл
            </button>
          </div>
          <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFile" />
        </div>

        <p v-if="error" class="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
          {{ error }}
        </p>

        <div class="mt-4 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[.05] p-3">
          <ShieldCheck :size="13" class="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p class="text-[10px] leading-5 text-sky-800/75 dark:text-sky-200/70">
            Все файлы формируются в браузере. Проект не отправляется на сервер. Для PDF подождите
            несколько секунд — отчёт рендерится локально.
          </p>
        </div>
      </div>

      <aside class="rounded-2xl border border-cloud-200 bg-cloud-50/60 p-4 dark:border-white/[.08] dark:bg-white/[.02]">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-400 dark:text-cloud-400/50">Смета</p>
          <span class="chip">{{ panel.componentCount }} поз.</span>
        </div>
        <p class="mt-3 text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{{ formatRub(total) }}</p>
        <p class="mt-1 text-[10px] text-ink-400 dark:text-cloud-400/60">Ориентировочная стоимость оборудования</p>

        <div class="mt-4 max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
          <div v-for="row in spec" :key="row.def.id" class="flex items-start justify-between gap-2 border-b border-cloud-200/60 py-1.5 last:border-0 dark:border-white/[.05]">
            <div class="min-w-0">
              <p class="truncate text-[10px] font-semibold text-ink-700 dark:text-cloud-300">{{ row.def.name }}</p>
              <p class="text-[8px] text-ink-400 dark:text-cloud-400/50">{{ row.def.brand }} · {{ row.quantity }} шт.</p>
            </div>
            <span class="shrink-0 font-mono text-[9px] text-ink-600 dark:text-cloud-300">{{ formatRub(row.amount) }}</span>
          </div>
        </div>

        <div class="mt-4 rounded-lg border border-cloud-200 bg-white/60 p-2.5 dark:border-white/[.07] dark:bg-white/[.03]">
          <p class="flex items-center gap-1.5 text-[9px] font-bold text-ink-600 dark:text-cloud-300">
            <CheckCircle2 :size="11" class="text-emerald-500" />
            {{ panel.wireCount }} проводов · {{ panel.componentCount }} компонентов
          </p>
          <p class="mt-1 text-[8px] leading-4 text-ink-400 dark:text-cloud-400/50">
            PDF-смета включает итог, характеристики сети и список оборудования.
          </p>
        </div>

        <button type="button" class="btn-primary mt-3 w-full !text-[10px]" :disabled="Boolean(busy)" @click="run('pdf', pdf, 'PDF-смета сформирована')">
          <LoaderCircle v-if="busy === 'pdf'" :size="13" class="animate-spin" />
          <Download v-else :size="13" />
          Скачать PDF-смету
        </button>
      </aside>
    </div>
  </ModalPanel>
</template>
