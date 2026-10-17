<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlignJustify,
  Cpu,
  Gauge,
  GripVertical,
  LogIn,
  PackageOpen,
  Plug,
  Plus,
  Search,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-vue-next'
import type { ComponentCategory, ComponentDef, PoleCount, TripCurve } from '@/types'
import { CATEGORY_META } from '@/data/library'
import { CATEGORY_ORDER, DRAG_MIME } from '@/config/editor'
import { useLibraryStore } from '@/stores/libraryStore'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { formatRub } from '@/utils/format'

const emit = defineEmits<{
  close: []
}>()

const library = useLibraryStore()
const panel = usePanelStore()
const ui = useUiStore()

const activeCategory = ref<ComponentCategory>('breakers')
const search = ref('')
const poles = ref<PoleCount | 0>(1)
const curve = ref<TripCurve | 'all'>('C')
const rating = ref<number | 0>(0)
const residual = ref<number | 0>(30)

const categoryIcons = {
  input: LogIn,
  breakers: Zap,
  rcd: ShieldCheck,
  rcbo: ShieldPlus,
  protection: Cpu,
  metering: Gauge,
  buses: AlignJustify,
  accessories: Plug,
}

const categoryCounts = computed(() => {
  const map = new Map<ComponentCategory, number>()
  for (const category of CATEGORY_ORDER) map.set(category, library.byCategory.get(category)?.length ?? 0)
  return map
})

const isSearching = computed(() => search.value.trim().length > 0)

const searchResults = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return []
  return library.definitions.filter(
    (def) =>
      def.name.toLowerCase().includes(query) ||
      def.brand.toLowerCase().includes(query) ||
      def.series.toLowerCase().includes(query) ||
      def.id.toLowerCase().includes(query),
  )
})

const filteredDefs = computed(() => {
  if (isSearching.value) return searchResults.value.slice(0, 80)
  let defs = library.byCategory.get(activeCategory.value) ?? []
  if (activeCategory.value === 'breakers' || activeCategory.value === 'rcbo') {
    if (poles.value) defs = defs.filter((def) => def.poles === poles.value)
    if (curve.value !== 'all') defs = defs.filter((def) => def.tripCurve === curve.value)
    if (rating.value) defs = defs.filter((def) => def.ratedCurrent === rating.value)
  }
  if (activeCategory.value === 'rcd') {
    if (poles.value) defs = defs.filter((def) => def.poles === poles.value)
    if (residual.value) defs = defs.filter((def) => def.residualCurrent === residual.value)
  }
  if (activeCategory.value === 'rcbo' && residual.value) {
    defs = defs.filter((def) => def.residualCurrent === residual.value)
  }
  return defs
})

const activeMeta = computed(() => CATEGORY_META[activeCategory.value])

const ratings = [6, 10, 16, 20, 25, 32, 40, 50, 63]
const leakages = [10, 30, 100, 300]

watch(activeCategory, (category) => {
  search.value = ''
  if (category === 'breakers') {
    poles.value = 1
    curve.value = 'C'
    rating.value = 0
  } else if (category === 'rcd') {
    poles.value = 2
    residual.value = 30
  } else if (category === 'rcbo') {
    poles.value = 2
    curve.value = 'C'
    residual.value = 30
  } else {
    poles.value = 0
    curve.value = 'all'
    rating.value = 0
  }
})

function chooseCategory(category: ComponentCategory): void {
  activeCategory.value = category
}

function onDragStart(event: DragEvent, def: ComponentDef): void {
  if (!event.dataTransfer) return
  ui.draggedDefId = def.id
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(DRAG_MIME, def.id)
  event.dataTransfer.setData('text/plain', def.id)
  const target = event.currentTarget as HTMLElement
  target.classList.add('opacity-60')
  window.setTimeout(() => target.classList.remove('opacity-60'), 0)
}

function onDragEnd(): void {
  ui.draggedDefId = null
}

function addComponent(def: ComponentDef): void {
  const result = panel.addComponent(def.id)
  ui.toast({
    title: result.ok ? 'Компонент добавлен' : 'Не удалось добавить',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function resetFilters(): void {
  poles.value = 0
  curve.value = 'all'
  rating.value = 0
  residual.value = 0
}

function setPoles(value: number): void {
  poles.value = value === 0 ? 0 : (value as PoleCount)
}

function setCurve(value: string): void {
  curve.value = value === 'all' ? 'all' : (value as TripCurve)
}
</script>

<template>
  <aside class="flex h-full min-h-0 w-full flex-col border-r border-white/[.07] bg-ink-900/95">
    <div class="flex shrink-0 items-start justify-between gap-3 border-b border-white/[.07] px-4 py-3.5">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-extrabold text-white">Библиотека</h2>
          <span class="rounded-full border border-white/10 bg-white/[.04] px-1.5 py-0.5 font-mono text-[8px] text-cloud-400">
            {{ library.totalCount }}
          </span>
        </div>
        <p class="mt-0.5 text-[10px] text-cloud-400/60">Перетащите оборудование на рейку</p>
      </div>
      <button type="button" class="rounded-lg p-1.5 text-cloud-400 transition hover:bg-white/[.06] hover:text-white lg:hidden" aria-label="Закрыть библиотеку" @click="emit('close')">
        <X :size="15" />
      </button>
    </div>

    <div class="shrink-0 px-3 pt-3">
      <div class="relative">
        <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cloud-400" />
        <input
          v-model="search"
          type="search"
          class="w-full rounded-lg border border-white/10 bg-ink-950/60 py-2 pl-9 pr-8 text-[11px] text-white placeholder:text-cloud-400/50 focus:border-volt-400/50 focus:outline-none"
          placeholder="Найти автомат, УЗО, бренд"
          aria-label="Поиск по библиотеке"
        />
        <button v-if="search" type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-cloud-400 hover:text-white" @click="search = ''">
          <X :size="12" />
        </button>
      </div>
    </div>

    <div v-if="!isSearching" class="shrink-0 px-3 pt-3">
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="category in CATEGORY_ORDER"
          :key="category"
          type="button"
          class="group flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition"
          :class="
            activeCategory === category
              ? 'border-volt-400/40 bg-volt-400/10 text-white'
              : 'border-white/[.06] bg-white/[.025] text-cloud-400 hover:border-white/15 hover:text-white'
          "
          @click="chooseCategory(category)"
        >
          <component
            :is="categoryIcons[category]"
            :size="12"
            :class="activeCategory === category ? 'text-volt-300' : 'text-cloud-400/60'"
          />
          <span class="min-w-0 flex-1 truncate text-[9px] font-bold">{{ CATEGORY_META[category].short }}</span>
          <span class="font-mono text-[7px] opacity-40">{{ categoryCounts.get(category) }}</span>
        </button>
      </div>
    </div>

    <div v-if="!isSearching" class="shrink-0 px-3 pt-3">
      <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-2.5">
        <div class="flex items-center justify-between gap-2">
          <p class="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-cloud-400/60">
            <SlidersHorizontal :size="10" /> Фильтр
          </p>
          <button type="button" class="text-[8px] font-semibold text-cloud-400/60 hover:text-white" @click="resetFilters">Сбросить</button>
        </div>

        <div v-if="activeCategory === 'breakers' || activeCategory === 'rcd' || activeCategory === 'rcbo'" class="mt-2 flex flex-wrap gap-1">
          <button
            v-for="pole in [0, 1, 2, 3, 4]"
            :key="pole"
            type="button"
            class="rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-bold transition"
            :class="poles === pole ? 'border-volt-400/40 bg-volt-400/15 text-volt-200' : 'border-white/[.07] text-cloud-400/60 hover:text-white'"
            @click="setPoles(pole)"
          >
            {{ pole ? `${pole}P` : 'Все' }}
          </button>
        </div>

        <div v-if="activeCategory === 'breakers' || activeCategory === 'rcbo'" class="mt-1.5 flex flex-wrap gap-1">
          <button
            v-for="item in ['all', 'B', 'C', 'D']"
            :key="item"
            type="button"
            class="rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-bold transition"
            :class="curve === item ? 'border-volt-400/40 bg-volt-400/15 text-volt-200' : 'border-white/[.07] text-cloud-400/60 hover:text-white'"
            @click="setCurve(item)"
          >
            {{ item === 'all' ? 'Все кривые' : item }}
          </button>
        </div>

        <div v-if="activeCategory === 'breakers' || activeCategory === 'rcbo'" class="mt-1.5">
          <select v-model.number="rating" class="w-full rounded-md border border-white/[.07] bg-ink-950/80 px-2 py-1 text-[9px] text-cloud-300 focus:outline-none">
            <option :value="0">Все номиналы</option>
            <option v-for="item in ratings" :key="item" :value="item">{{ item }} А</option>
          </select>
        </div>

        <div v-if="activeCategory === 'rcd' || activeCategory === 'rcbo'" class="mt-1.5 flex flex-wrap gap-1">
          <button
            v-for="item in [0, ...leakages]"
            :key="item"
            type="button"
            class="rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-bold transition"
            :class="residual === item ? 'border-volt-400/40 bg-volt-400/15 text-volt-200' : 'border-white/[.07] text-cloud-400/60 hover:text-white'"
            @click="residual = item"
          >
            {{ item ? `${item} мА` : 'Все' }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
      <p class="text-[8px] font-extrabold uppercase tracking-[0.14em] text-cloud-400/50">
        {{ isSearching ? 'Результаты поиска' : activeMeta.label }}
      </p>
      <span class="font-mono text-[8px] text-cloud-400/40">{{ filteredDefs.length }}</span>
    </div>

    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      <div v-if="filteredDefs.length" class="space-y-1.5">
        <article
          v-for="def in filteredDefs"
          :key="def.id"
          class="group relative flex cursor-grab items-stretch gap-2 rounded-xl border border-white/[.06] bg-white/[.025] p-2.5 transition hover:border-volt-400/25 hover:bg-white/[.045] active:cursor-grabbing"
          draggable="true"
          @dragstart="onDragStart($event, def)"
          @dragend="onDragEnd"
        >
          <div class="flex w-4 shrink-0 items-center justify-center text-cloud-400/25 group-hover:text-cloud-400/60">
            <GripVertical :size="11" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate text-[10.5px] font-extrabold leading-4 text-cloud-100">{{ def.name }}</p>
              <button
                type="button"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[.04] text-cloud-400 transition hover:border-volt-400/40 hover:bg-volt-400/15 hover:text-volt-200"
                :aria-label="`Добавить ${def.name}`"
                :title="`Добавить ${def.name}`"
                @click.stop="addComponent(def)"
              >
                <Plus :size="11" />
              </button>
            </div>
            <p class="mt-0.5 text-[8px] text-cloud-400/50">{{ def.brand }} · {{ def.series }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[7.5px] text-cloud-400/70">
              <span class="rounded border border-white/[.07] px-1 py-0.5">{{ def.sizeModules }} мод.</span>
              <span v-if="def.ratedCurrent">{{ def.ratedCurrent }}А</span>
              <span v-if="def.tripCurve">кривая {{ def.tripCurve }}</span>
              <span v-if="def.residualCurrent">{{ def.residualCurrent }}мА</span>
            </div>
            <p class="mt-1.5 text-[9px] font-bold text-volt-300/80">{{ formatRub(def.price) }}</p>
          </div>
        </article>
      </div>

      <div v-else class="flex flex-col items-center px-4 py-12 text-center">
        <PackageOpen :size="26" class="text-cloud-400/30" />
        <p class="mt-3 text-[11px] font-bold text-cloud-300">Ничего не найдено</p>
        <p class="mt-1 text-[9px] leading-4 text-cloud-400/50">Измените фильтры или строку поиска</p>
        <button type="button" class="mt-3 text-[9px] font-bold text-volt-300" @click="search = ''; resetFilters()">Сбросить</button>
      </div>
    </div>

    <div class="shrink-0 border-t border-white/[.07] bg-white/[.02] px-4 py-2.5">
      <p class="flex items-center gap-1.5 text-[8px] leading-4 text-cloud-400/50">
        <GripVertical :size="10" />
        Перетащите карточку на нужную позицию рейки или нажмите «+»
      </p>
    </div>
  </aside>
</template>
