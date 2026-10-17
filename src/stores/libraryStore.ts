import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ComponentCategory, ComponentDef } from '@/types'
import { COMPONENT_LIBRARY } from '@/data/library'
import { CATEGORY_ORDER } from '@/config/editor'

export const useLibraryStore = defineStore('library', () => {
  const definitions = ref<ComponentDef[]>(COMPONENT_LIBRARY)
  const categories = computed<ComponentCategory[]>(() => CATEGORY_ORDER)
  const byCategory = computed(() => {
    const map = new Map<ComponentCategory, ComponentDef[]>()
    for (const category of CATEGORY_ORDER) map.set(category, [])
    for (const def of definitions.value) {
      map.get(def.category)?.push(def)
    }
    return map
  })
  const totalCount = computed(() => definitions.value.length)
  const brands = computed(() => [...new Set(definitions.value.map((def) => def.brand))].sort())

  function findById(defId: string): ComponentDef | undefined {
    return definitions.value.find((def) => def.id === defId)
  }

  return { definitions, categories, byCategory, totalCount, brands, findById }
})
