<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Activity, SlidersHorizontal, X } from 'lucide-vue-next'
import type { LoadConsumer } from '@/types'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import PalettePanel from '@/components/editor/PalettePanel.vue'
import PanelCanvas from '@/components/editor/PanelCanvas.vue'
import CalculationPanel from '@/components/editor/CalculationPanel.vue'
import PropertiesPanel from '@/components/editor/PropertiesPanel.vue'
import ConsumerDialog from '@/components/editor/ConsumerDialog.vue'
import ExportDialog from '@/components/editor/ExportDialog.vue'
import ProjectSettingsDialog from '@/components/editor/ProjectSettingsDialog.vue'
import ModalPanel from '@/components/common/ModalPanel.vue'
import { usePanelStore } from '@/stores/panelStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useUiStore } from '@/stores/uiStore'

const route = useRoute()
const router = useRouter()
const panel = usePanelStore()
const projects = useProjectsStore()
const ui = useUiStore()

const dirty = ref(false)
const saving = ref(false)
const paletteOpen = ref(false)
const inspectorOpen = ref(false)
const exportOpen = ref(false)
const settingsOpen = ref(false)
const consumerOpen = ref(false)
const consumerEditing = ref<LoadConsumer | null>(null)
const consumerLineUid = ref<string | null>(null)
const renameOpen = ref(false)
const renameName = ref('')

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let stopWatch: (() => void) | null = null
let suppressWatch = false

const activeTab = computed(() => panel.activeTab)
const issueCount = computed(
  () => panel.calculation.issues.filter((issue) => issue.severity === 'error' || issue.severity === 'warning').length,
)
const hasErrors = computed(() =>
  panel.calculation.issues.some((issue) => issue.severity === 'error'),
)

function initialize(): void {
  projects.initialize()
  const id = typeof route.query.id === 'string' ? route.query.id : ''
  if (id) {
    const project = projects.getById(id)
    if (project) {
      panel.loadProject(project)
    } else {
      panel.initialize()
      ui.toast({
        title: 'Проект не найден',
        message: 'Открыт черновик из этого браузера.',
        tone: 'warning',
      })
    }
  } else {
    panel.initialize()
    if (panel.project.components.length === 0) {
      // Черновик пуст — предлагаем демо, но не перезаписываем осознанно созданный проект.
      const draftName = panel.project.name
      if (draftName === 'Новый проект щита') panel.loadDemo()
    }
  }
  panel.activeTab = 'calc'
  dirty.value = false
  startAutosave()
}

function startAutosave(): void {
  stopWatch?.()
  // Глубокий watch на проект: изменение сразу попадает в черновик,
  // а сохранённый проект обновляется автоматически после паузы.
  stopWatch = watch(
    () => panel.project,
    () => {
      if (suppressWatch) return
      dirty.value = true
      if (autosaveTimer) clearTimeout(autosaveTimer)
      autosaveTimer = setTimeout(() => {
        panel.persistDraft()
        if (projects.getById(panel.project.id)) {
          saving.value = true
          projects.save(panel.project)
          dirty.value = false
          window.setTimeout(() => {
            saving.value = false
          }, 350)
        }
      }, 1100)
    },
    { deep: true },
  )
}

function openAddConsumer(componentUid?: string): void {
  consumerEditing.value = null
  consumerLineUid.value = componentUid ?? panel.selectedComponentUid
  consumerOpen.value = true
}

function openEditConsumer(consumer: LoadConsumer): void {
  consumerEditing.value = consumer
  consumerLineUid.value = null
  consumerOpen.value = true
}

function openRename(): void {
  renameName.value = panel.project.name
  renameOpen.value = true
}

function confirmRename(): void {
  panel.updateProjectMeta({ name: renameName.value })
  renameOpen.value = false
  dirty.value = true
  ui.toast({ title: 'Проект переименован', tone: 'success' })
}

function saveProject(): void {
  saving.value = true
  const saved = projects.save(panel.project)
  suppressWatch = true
  panel.markSaved()
  dirty.value = false
  saving.value = false
  if (typeof route.query.id !== 'string' || route.query.id !== saved.id) {
    void router.replace({ path: '/editor', query: { id: saved.id } })
  }
  ui.toast({
    title: hasErrors.value ? 'Проект сохранён с ошибками' : 'Проект сохранён',
    message: hasErrors.value ? 'Проверьте подсвеченные линии.' : 'Доступен в разделе «Проекты».',
    tone: hasErrors.value ? 'warning' : 'success',
  })
  window.setTimeout(() => {
    suppressWatch = false
  }, 0)
}

function onImported(): void {
  dirty.value = true
  if (typeof route.query.id !== 'string' || route.query.id !== panel.project.id) {
    void router.replace({ path: '/editor', query: { id: panel.project.id } })
  }
}

onMounted(() => {
  initialize()
})

onBeforeUnmount(() => {
  stopWatch?.()
  if (autosaveTimer) clearTimeout(autosaveTimer)
  panel.persistDraft()
})
</script>

<template>
  <div class="flex h-screen min-h-0 flex-col overflow-hidden bg-ink-950 text-white">
    <EditorToolbar
      :dirty="dirty"
      :saving="saving"
      @open-palette="paletteOpen = true"
      @open-inspector="inspectorOpen = true"
      @save="saveProject"
      @export="exportOpen = true"
      @settings="settingsOpen = true"
      @rename="openRename"
    />

    <div class="relative flex min-h-0 flex-1">
      <div class="hidden w-[292px] shrink-0 lg:block">
        <PalettePanel />
      </div>

      <main class="flex min-w-0 flex-1 flex-col">
        <PanelCanvas />
      </main>

      <aside class="hidden w-[372px] shrink-0 border-l border-white/[.07] bg-ink-900/95 xl:flex xl:flex-col">
        <div class="flex h-11 shrink-0 items-center gap-1 border-b border-white/[.07] px-2">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition"
            :class="activeTab === 'calc' ? 'bg-white/[.07] text-white' : 'text-cloud-400 hover:text-white'"
            @click="panel.activeTab = 'calc'"
          >
            <Activity :size="12" /> Расчёты
            <span
              v-if="issueCount"
              class="rounded-full px-1 font-mono text-[7px]"
              :class="hasErrors ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'"
            >
              {{ issueCount }}
            </span>
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition"
            :class="activeTab === 'inspector' ? 'bg-white/[.07] text-white' : 'text-cloud-400 hover:text-white'"
            @click="panel.activeTab = 'inspector'"
          >
            <SlidersHorizontal :size="12" /> Свойства
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <CalculationPanel
            v-if="activeTab === 'calc'"
            @add-consumer="openAddConsumer"
            @edit-consumer="openEditConsumer"
            @export="exportOpen = true"
            @settings="settingsOpen = true"
          />
          <PropertiesPanel
            v-else
            @add-consumer="openAddConsumer"
            @edit-consumer="openEditConsumer"
            @settings="settingsOpen = true"
          />
        </div>
      </aside>
    </div>

    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="paletteOpen" class="fixed inset-0 z-[80] flex bg-ink-950/70 backdrop-blur-sm lg:hidden" @click.self="paletteOpen = false">
        <div class="h-full w-[310px] max-w-[88vw] shadow-2xl">
          <PalettePanel @close="paletteOpen = false" />
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-x-4 opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div v-if="inspectorOpen" class="fixed inset-0 z-[80] flex justify-end bg-ink-950/70 backdrop-blur-sm xl:hidden" @click.self="inspectorOpen = false">
        <div class="flex h-full w-[390px] max-w-[92vw] flex-col border-l border-white/10 bg-ink-900 shadow-2xl">
          <div class="flex h-11 shrink-0 items-center border-b border-white/[.07] px-2">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition"
              :class="activeTab === 'calc' ? 'bg-white/[.07] text-white' : 'text-cloud-400'"
              @click="panel.activeTab = 'calc'"
            >
              <Activity :size="12" /> Расчёты
            </button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition"
              :class="activeTab === 'inspector' ? 'bg-white/[.07] text-white' : 'text-cloud-400'"
              @click="panel.activeTab = 'inspector'"
            >
              <SlidersHorizontal :size="12" /> Свойства
            </button>
            <button type="button" class="ml-1 rounded-lg p-2 text-cloud-400 hover:bg-white/[.06] hover:text-white" aria-label="Закрыть панель" @click="inspectorOpen = false">
              <X :size="15" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <CalculationPanel
              v-if="activeTab === 'calc'"
              @add-consumer="openAddConsumer"
              @edit-consumer="openEditConsumer"
              @export="exportOpen = true"
              @settings="settingsOpen = true"
            />
            <PropertiesPanel
              v-else
              @add-consumer="openAddConsumer"
              @edit-consumer="openEditConsumer"
              @settings="settingsOpen = true"
            />
          </div>
        </div>
      </div>
    </Transition>

    <ExportDialog v-model="exportOpen" @imported="onImported" />
    <ProjectSettingsDialog v-model="settingsOpen" />
    <ConsumerDialog
      v-model="consumerOpen"
      :consumer="consumerEditing"
      :default-component-uid="consumerLineUid"
    />

    <ModalPanel v-model="renameOpen" title="Переименовать проект" size="sm">
      <label class="block">
        <span class="field-label">Название</span>
        <input v-model="renameName" class="input" @keyup.enter="confirmRename" />
      </label>
      <template #footer>
        <button type="button" class="btn-secondary" @click="renameOpen = false">Отмена</button>
        <button type="button" class="btn-primary" @click="confirmRename">Сохранить</button>
      </template>
    </ModalPanel>
  </div>
</template>
