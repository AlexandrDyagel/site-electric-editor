import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { PanelProject, ProjectSummary } from '@/types'
import { createDemoProject, createEmptyProject, duplicateProject } from '@/data/demo'
import { buildLayout } from '@/services/layoutEngine'
import { calculatePanel } from '@/services/calcEngine'

const STORAGE_KEY = 'voltlab.projects.v1'
const MAX_PROJECTS = 40

function readProjects(): PanelProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isProjectLike) as PanelProject[]
  } catch {
    return []
  }
}

function isProjectLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PanelProject>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.rails) &&
    Array.isArray(candidate.components) &&
    Array.isArray(candidate.wires) &&
    Array.isArray(candidate.consumers) &&
    candidate.version === 1
  )
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<PanelProject[]>([])
  const initialized = ref(false)

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.value.slice(0, MAX_PROJECTS)))
    } catch {
      // Квота localStorage может быть исчерпана — интерфейс продолжает работать.
    }
  }

  function initialize(): void {
    if (initialized.value) return
    projects.value = readProjects()
    if (projects.value.length === 0) {
      const demo = createDemoProject('Квартирный щит · демо')
      projects.value = [demo]
      persist()
    }
    initialized.value = true
  }

  function getById(id: string): PanelProject | undefined {
    initialize()
    return projects.value.find((project) => project.id === id)
  }

  function save(project: PanelProject): PanelProject {
    initialize()
    const copy: PanelProject = JSON.parse(JSON.stringify(project)) as PanelProject
    copy.updatedAt = new Date().toISOString()
    const index = projects.value.findIndex((item) => item.id === copy.id)
    if (index >= 0) {
      projects.value.splice(index, 1, copy)
    } else {
      projects.value.unshift(copy)
    }
    projects.value = projects.value
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    persist()
    return copy
  }

  function create(name = 'Новый проект', withDemo = false): PanelProject {
    initialize()
    const project = withDemo ? createDemoProject(name) : createEmptyProject(name)
    projects.value.unshift(project)
    persist()
    return project
  }

  function duplicate(id: string): PanelProject | null {
    const source = getById(id)
    if (!source) return null
    const copy = duplicateProject(source)
    projects.value.unshift(copy)
    persist()
    return copy
  }

  function remove(id: string): void {
    projects.value = projects.value.filter((project) => project.id !== id)
    persist()
  }

  function rename(id: string, name: string): void {
    const project = projects.value.find((item) => item.id === id)
    if (!project) return
    project.name = name.trim() || 'Без названия'
    project.updatedAt = new Date().toISOString()
    persist()
  }

  const summaries = computed<ProjectSummary[]>(() => {
    initialize()
    return projects.value.map((project) => {
      const layout = buildLayout(project)
      const calc = calculatePanel(project, layout)
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        updatedAt: project.updatedAt,
        componentCount: project.components.length,
        lineCount: calc.lines.length,
        totalPowerW: calc.totalInstalledPowerW,
        status: calc.status,
      }
    })
  })

  return {
    projects,
    initialized,
    summaries,
    initialize,
    getById,
    save,
    create,
    duplicate,
    remove,
    rename,
  }
})
