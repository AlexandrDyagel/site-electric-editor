<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowUpRight,
  Copy,
  FolderOpen,
  Layers3,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import ModalPanel from '@/components/common/ModalPanel.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { useProjectsStore } from '@/stores/projectsStore'
import { useUiStore } from '@/stores/uiStore'
import { formatDateTime, formatPower, pluralize } from '@/utils/format'
import { usePageMeta } from '@/composables/usePageMeta'

const projects = useProjectsStore()
const ui = useUiStore()
const router = useRouter()
const search = ref('')

const createOpen = ref(false)
const renameOpen = ref(false)
const deleteOpen = ref(false)
const createName = ref('Новый проект щита')
const createDemo = ref(false)
const renameName = ref('')
const activeId = ref<string | null>(null)

usePageMeta({
  title: 'Мои проекты щитов — ВОЛЬТ.ЛАБ',
  description: 'Сохранённые проекты электрических щитов: создание, дублирование, переименование и удаление.',
})

onMounted(() => projects.initialize())

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return projects.summaries
  return projects.summaries.filter(
    (project) =>
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query),
  )
})

const activeProject = computed(() =>
  projects.projects.find((project) => project.id === activeId.value),
)

function openProject(id: string): void {
  void router.push({ path: '/editor', query: { id } })
}

function openCreate(): void {
  createName.value = 'Новый проект щита'
  createDemo.value = false
  createOpen.value = true
}

function createProject(): void {
  const project = projects.create(createName.value.trim() || 'Новый проект', createDemo.value)
  createOpen.value = false
  ui.toast({ title: 'Проект создан', message: project.name, tone: 'success' })
  openProject(project.id)
}

function duplicateProject(id: string): void {
  const copy = projects.duplicate(id)
  if (!copy) return
  ui.toast({ title: 'Проект дублирован', message: copy.name, tone: 'success' })
}

function openRename(id: string): void {
  activeId.value = id
  renameName.value = activeProject.value?.name ?? ''
  renameOpen.value = true
}

function confirmRename(): void {
  if (!activeId.value) return
  projects.rename(activeId.value, renameName.value)
  renameOpen.value = false
  ui.toast({ title: 'Название обновлено', tone: 'success' })
}

function openDelete(id: string): void {
  activeId.value = id
  deleteOpen.value = true
}

function confirmDelete(): void {
  if (!activeId.value) return
  const name = activeProject.value?.name ?? 'Проект'
  projects.remove(activeId.value)
  deleteOpen.value = false
  ui.toast({ title: 'Проект удалён', message: name, tone: 'info' })
}
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-cloud-200/70 dark:border-white/[.06]">
      <div class="pointer-events-none absolute inset-0 bg-grid-light bg-[size:44px_44px] opacity-35 dark:bg-grid-dark dark:opacity-50"></div>
      <div class="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-volt-300/20 blur-[100px] dark:bg-volt-400/[.06]"></div>
      <div class="container-page relative py-12 lg:py-16">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow">Личный кабинет</p>
            <h1 class="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-ink-950 sm:text-5xl dark:text-white">
              Мои проекты
            </h1>
            <p class="mt-3 max-w-xl text-sm leading-6 text-ink-500 dark:text-cloud-400">
              Проекты сохраняются в этом браузере. Откройте схему, продолжите расчёт или создайте
              новый щит с нуля.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink to="/editor" class="btn-secondary">
              <FolderOpen :size="15" /> Текущий черновик
            </RouterLink>
            <button type="button" class="btn-primary" @click="openCreate">
              <Plus :size="15" /> Новый проект
            </button>
          </div>
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="relative w-full sm:max-w-xs">
            <Search :size="15" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 dark:text-cloud-400" />
            <input v-model="search" type="search" class="input !pl-10" placeholder="Найти проект" aria-label="Поиск проекта" />
          </div>
          <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 dark:text-cloud-400/50">
            {{ projects.projects.length }} {{ pluralize(projects.projects.length, 'проект', 'проекта', 'проектов') }} · localStorage
          </p>
        </div>
      </div>
    </section>

    <section class="container-page py-10 lg:py-14">
      <div v-if="filtered.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="project in filtered"
          :key="project.id"
          class="surface group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-volt-500/30 hover:shadow-lift"
        >
          <button type="button" class="relative block overflow-hidden border-b border-cloud-200/70 bg-ink-900 p-4 text-left dark:border-white/[.06]" @click="openProject(project.id)">
            <div class="absolute inset-0 bg-grid-dark bg-[size:20px_20px] opacity-40"></div>
            <div class="relative">
              <div class="flex items-center justify-between">
                <span class="font-mono text-[8px] uppercase tracking-wider text-white/30">project / {{ project.id.slice(-6) }}</span>
                <StatusPill :status="project.status" size="sm" />
              </div>
              <div class="mt-4 flex gap-1 rounded-md bg-black/25 p-1.5">
                <span
                  v-for="index in Math.min(10, Math.max(4, project.componentCount))"
                  :key="index"
                  class="h-8 rounded-[2px] border border-white/10 bg-white/[.07]"
                  :class="index % 4 === 0 ? 'flex-[1.4] bg-volt-400/[.12]' : 'flex-1'"
                ></span>
              </div>
              <div class="relative mt-[-1px] h-1 rounded-sm bg-gradient-to-b from-slate-500/50 to-slate-700/20"></div>
              <div class="mt-3 flex items-center justify-between text-[9px] text-white/35">
                <span class="font-mono">{{ project.componentCount }} компонентов</span>
                <span class="font-mono">{{ project.lineCount }} линий</span>
              </div>
            </div>
          </button>

          <div class="flex flex-1 flex-col p-5">
            <h2 class="text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">{{ project.name }}</h2>
            <p class="mt-1.5 line-clamp-2 text-[11px] leading-5 text-ink-500 dark:text-cloud-400">
              {{ project.description || 'Без описания' }}
            </p>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-lg bg-cloud-50 px-3 py-2 dark:bg-white/[.03]">
                <p class="text-[8px] uppercase tracking-wider text-ink-400 dark:text-cloud-400/50">Мощность</p>
                <p class="mt-0.5 font-mono text-xs font-bold text-ink-800 dark:text-cloud-200">{{ formatPower(project.totalPowerW) }}</p>
              </div>
              <div class="rounded-lg bg-cloud-50 px-3 py-2 dark:bg-white/[.03]">
                <p class="text-[8px] uppercase tracking-wider text-ink-400 dark:text-cloud-400/50">Изменён</p>
                <p class="mt-0.5 font-mono text-[10px] font-bold text-ink-800 dark:text-cloud-200">{{ formatDateTime(project.updatedAt) }}</p>
              </div>
            </div>
            <div class="mt-auto flex items-center justify-between border-t border-cloud-200 pt-4 dark:border-white/[.06]">
              <div class="flex items-center gap-1">
                <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-cloud-100 hover:text-ink-800 dark:hover:bg-white/[.06] dark:hover:text-white" title="Переименовать" aria-label="Переименовать" @click="openRename(project.id)">
                  <Pencil :size="14" />
                </button>
                <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-cloud-100 hover:text-ink-800 dark:hover:bg-white/[.06] dark:hover:text-white" title="Дублировать" aria-label="Дублировать" @click="duplicateProject(project.id)">
                  <Copy :size="14" />
                </button>
                <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-rose-500/10 hover:text-rose-500" title="Удалить" aria-label="Удалить" @click="openDelete(project.id)">
                  <Trash2 :size="14" />
                </button>
              </div>
              <button type="button" class="inline-flex items-center gap-1 text-[11px] font-bold text-volt-700 dark:text-volt-300" @click="openProject(project.id)">
                Открыть <ArrowUpRight :size="13" />
              </button>
            </div>
          </div>
        </article>

        <button
          type="button"
          class="group flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-cloud-300 bg-white/30 p-6 text-center transition hover:border-volt-500/50 hover:bg-volt-400/[.04] dark:border-white/15 dark:bg-white/[.01]"
          @click="openCreate"
        >
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl border border-cloud-200 bg-white text-ink-400 transition group-hover:border-volt-500/30 group-hover:text-volt-600 dark:border-white/10 dark:bg-white/[.04] dark:text-cloud-400 dark:group-hover:text-volt-300">
            <Plus :size="20" />
          </span>
          <p class="mt-4 text-sm font-extrabold text-ink-800 dark:text-cloud-200">Новый проект</p>
          <p class="mt-1 max-w-[200px] text-[11px] leading-5 text-ink-400 dark:text-cloud-400/60">Пустой щит или готовая демо-схема</p>
        </button>
      </div>

      <div v-else class="surface flex flex-col items-center px-6 py-20 text-center">
        <Layers3 :size="32" class="text-volt-600 dark:text-volt-400" />
        <h2 class="mt-4 text-xl font-extrabold text-ink-900 dark:text-white">
          {{ search ? 'Ничего не найдено' : 'Проектов пока нет' }}
        </h2>
        <p class="mt-2 max-w-sm text-sm text-ink-500 dark:text-cloud-400">
          {{ search ? 'Попробуйте изменить поисковый запрос.' : 'Создайте первый щит или начните с готовой демо-схемы.' }}
        </p>
        <button v-if="search" type="button" class="btn-secondary mt-6" @click="search = ''">Сбросить поиск</button>
        <button v-else type="button" class="btn-primary mt-6" @click="openCreate"><Plus :size="15" /> Создать проект</button>
      </div>

      <div class="mt-8 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <div class="surface flex items-start gap-4 p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-volt-400/12 text-volt-700 dark:text-volt-300">
            <Sparkles :size="18" />
          </span>
          <div>
            <h3 class="text-sm font-extrabold text-ink-900 dark:text-white">Локальное хранение</h3>
            <p class="mt-1.5 text-[11px] leading-5 text-ink-500 dark:text-cloud-400">
              Проекты хранятся в localStorage браузера. Для переноса на другое устройство
              используйте экспорт JSON в редакторе. Очистка данных браузера удалит сохранённые проекты.
            </p>
          </div>
        </div>
        <div class="relative overflow-hidden rounded-2xl border border-volt-500/20 bg-ink-900 p-5 text-white">
          <div class="absolute inset-0 bg-grid-dark bg-[size:20px_20px] opacity-40"></div>
          <div class="relative flex h-full flex-col justify-between">
            <div>
              <Zap :size="17" class="text-volt-300" />
              <p class="mt-3 text-sm font-extrabold">Начните с демо</p>
              <p class="mt-1 text-[10px] leading-5 text-cloud-400">Готовая трёхфазная схема с расчётом и проверками.</p>
            </div>
            <RouterLink to="/editor" class="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-volt-300">
              Открыть демо <ArrowUpRight :size="12" />
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <ModalPanel v-model="createOpen" title="Новый проект" description="Задайте имя и выберите стартовый шаблон." size="sm">
      <div class="space-y-4">
        <label class="block">
          <span class="field-label">Название</span>
          <input v-model="createName" class="input" placeholder="Например, Щит коттеджа" @keyup.enter="createProject" />
        </label>
        <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-cloud-200 p-3 dark:border-white/10">
          <input v-model="createDemo" type="checkbox" class="mt-0.5 h-4 w-4 accent-volt-500" />
          <span>
            <span class="block text-xs font-bold text-ink-800 dark:text-cloud-200">Начать с демо-схемы</span>
            <span class="mt-0.5 block text-[10px] leading-4 text-ink-400 dark:text-cloud-400/60">Трёхфазный щит с шестью линиями и расчётом.</span>
          </span>
        </label>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="createOpen = false">Отмена</button>
        <button type="button" class="btn-primary" @click="createProject">Создать и открыть</button>
      </template>
    </ModalPanel>

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

    <ModalPanel v-model="deleteOpen" title="Удалить проект?" description="Действие нельзя отменить." size="sm">
      <p class="text-sm text-ink-600 dark:text-cloud-300">
        Проект «{{ activeProject?.name }}» будет удалён из этого браузера. При необходимости
        сначала экспортируйте JSON.
      </p>
      <template #footer>
        <button type="button" class="btn-secondary" @click="deleteOpen = false">Отмена</button>
        <button type="button" class="btn-danger" @click="confirmDelete">Удалить</button>
      </template>
    </ModalPanel>
  </div>
</template>
