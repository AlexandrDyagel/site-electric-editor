<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertTriangle,
  BoxSelect,
  Cable,
  CheckCircle2,
  Copy,
  Gauge,
  Info,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import type {
  CableInsulation,
  CableMaterial,
  CircuitConfig,
  LayingMethod,
  LoadConsumer,
  PhaseTag,
  WireKind,
} from '@/types'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { CATEGORY_META } from '@/data/library'
import {
  CABLE_SECTIONS,
  INSULATION_LABELS,
  LAYING_LABELS,
  MATERIAL_LABELS,
} from '@/data/pue'
import { defaultCircuit } from '@/services/calcEngine'
import { railFreeModules } from '@/services/layoutEngine'
import { formatNumber, formatPower, formatRub, pluralize } from '@/utils/format'
import { WIRE_KIND_LABEL, wireColor } from '@/utils/wire'

const emit = defineEmits<{
  'add-consumer': [componentUid?: string]
  'edit-consumer': [consumer: LoadConsumer]
  settings: []
}>()

const panel = usePanelStore()
const ui = useUiStore()
const nameDraft = ref('')

const selected = computed(() => panel.selectedComponent)
const selectedWire = computed(() => panel.selectedWire)
const projection = computed(() => panel.project)

const componentWires = computed(() => {
  if (!selected.value) return []
  const prefix = `${selected.value.placed.uid}:`
  return projection.value.wires.filter(
    (wire) => wire.from.startsWith(prefix) || wire.to.startsWith(prefix),
  )
})

const activeLine = computed(() => {
  if (!selected.value) return null
  return panel.calculation.lines.find((line) => line.componentUid === selected.value?.placed.uid) ?? null
})

const lineConsumers = computed(() => {
  if (!selected.value) return []
  const uid = selected.value.placed.uid
  return projection.value.consumers.filter((consumer) => {
    if (consumer.wireUidOrTerminalUid.startsWith(`${uid}:`)) return true
    const wire = projection.value.wires.find((item) => item.uid === consumer.wireUidOrTerminalUid)
    return Boolean(wire?.from.startsWith(`${uid}:`) || wire?.to.startsWith(`${uid}:`))
  })
})

const circuit = computed<CircuitConfig>(() => {
  if (!selected.value) {
    return defaultCircuit('', 16)
  }
  const uid = selected.value.placed.uid
  return (
    projection.value.circuits.find((item) => item.componentUid === uid) ??
    defaultCircuit(uid, selected.value.def.ratedCurrent ?? 16)
  )
})

const isProtective = computed(() => Boolean(selected.value?.def.protective))

watch(
  () => panel.selectedComponentUid,
  () => {
    const component = panel.selectedComponent
    nameDraft.value = component?.placed.customName ?? component?.def.name ?? ''
  },
  { immediate: true },
)

function commitName(): void {
  if (!selected.value) return
  const fallback = selected.value.def.name
  panel.renameComponent(selected.value.placed.uid, nameDraft.value.trim() || fallback)
  nameDraft.value = nameDraft.value.trim() || fallback
}

function patchCircuit(patch: Partial<Omit<CircuitConfig, 'componentUid'>>): void {
  if (!selected.value) return
  panel.updateCircuit(selected.value.placed.uid, patch)
}

const cableSectionModel = computed<number>({
  get: () => circuit.value.cableSection,
  set: (value) => patchCircuit({ cableSection: Number(value) }),
})
const materialModel = computed<CableMaterial>({
  get: () => circuit.value.material,
  set: (value) => patchCircuit({ material: value }),
})
const insulationModel = computed<CableInsulation>({
  get: () => circuit.value.insulation,
  set: (value) => patchCircuit({ insulation: value }),
})
const layingModel = computed<LayingMethod>({
  get: () => circuit.value.laying,
  set: (value) => patchCircuit({ laying: value }),
})
const lengthModel = computed<number>({
  get: () => circuit.value.lengthM,
  set: (value) => patchCircuit({ lengthM: Math.max(0, Number(value) || 0) }),
})
const ambientModel = computed<number>({
  get: () => circuit.value.ambientC,
  set: (value) => patchCircuit({ ambientC: Math.max(-10, Math.min(60, Number(value) || 25)) }),
})
const groupModel = computed<number>({
  get: () => circuit.value.groupCount,
  set: (value) => patchCircuit({ groupCount: Math.max(1, Math.min(8, Number(value) || 1)) }),
})

const wireKindModel = computed<WireKind>({
  get: () => selectedWire.value?.kind ?? 'phase',
  set: (value) => {
    if (selectedWire.value) panel.updateWire(selectedWire.value.uid, { kind: value })
  },
})
const wirePhaseModel = computed<PhaseTag>({
  get: () => selectedWire.value?.phase ?? 'L1',
  set: (value) => {
    if (selectedWire.value) panel.updateWire(selectedWire.value.uid, { phase: value })
  },
})
const wireSectionModel = computed<number>({
  get: () => selectedWire.value?.crossSection ?? 2.5,
  set: (value) => {
    if (selectedWire.value) panel.updateWire(selectedWire.value.uid, { crossSection: Number(value) })
  },
})
const wireColorModel = computed<string>({
  get: () =>
    selectedWire.value?.color ??
    wireColor(selectedWire.value?.kind ?? 'phase', selectedWire.value?.phase),
  set: (value) => {
    if (selectedWire.value) panel.updateWire(selectedWire.value.uid, { color: value })
  },
})

const wireEndpoint = computed(() => {
  if (!selectedWire.value) return { from: '—', to: '—' }
  const from = panel.layout.terminals.get(selectedWire.value.from)
  const to = panel.layout.terminals.get(selectedWire.value.to)
  const name = (componentUid: string | undefined): string => {
    if (!componentUid) return '—'
    const component = panel.layout.components.find((item) => item.placed.uid === componentUid)
    return component?.placed.customName ?? component?.def.name ?? componentUid
  }
  return {
    from: `${name(from?.componentUid)} · ${from?.label ?? '?'}`,
    to: `${name(to?.componentUid)} · ${to?.label ?? '?'}`,
  }
})

const railsInfo = computed(() =>
  panel.project.rails.map((rail) => ({
    ...rail,
    free: railFreeModules(panel.project, rail.id),
    used: rail.capacity - railFreeModules(panel.project, rail.id),
  })),
)

function removeSelected(): void {
  if (!selected.value) return
  const result = panel.removeComponent(selected.value.placed.uid)
  ui.toast({
    title: result.ok ? 'Компонент удалён' : 'Не удалось удалить',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function removeSelectedGroup(): void {
  const uids = [...panel.selectedComponentUids]
  if (uids.length < 2) return
  const result = panel.removeComponents(uids)
  ui.toast({
    title: result.ok ? 'Группа удалена' : 'Не удалось удалить',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function duplicateSelected(): void {
  if (!selected.value) return
  const result = panel.duplicateComponent(selected.value.placed.uid)
  ui.toast({
    title: result.ok ? 'Копия создана' : 'Не удалось скопировать',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function removeWire(): void {
  if (!selectedWire.value) return
  const result = panel.removeWire(selectedWire.value.uid)
  ui.toast({
    title: result.ok ? 'Провод удалён' : 'Не удалось удалить',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function removeConsumer(consumer: LoadConsumer): void {
  const result = panel.removeConsumer(consumer.uid)
  ui.toast({
    title: result.ok ? 'Потребитель удалён' : 'Не удалось удалить',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function addRail(): void {
  const result = panel.addRail()
  ui.toast({
    title: result.ok ? 'Рейка добавлена' : 'Не удалось',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

const detailRows = computed(() => {
  if (!selected.value) return []
  const def = selected.value.def
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Категория', value: CATEGORY_META[def.category].short },
    { label: 'Полюсов', value: `${def.poles}P` },
    { label: 'Модулей', value: `${def.sizeModules}` },
    { label: 'Бренд', value: def.brand },
  ]
  if (def.ratedCurrent) rows.push({ label: 'Номинал', value: `${def.ratedCurrent} А` })
  if (def.tripCurve) rows.push({ label: 'Кривая', value: def.tripCurve })
  if (def.residualCurrent) rows.push({ label: 'Утечка', value: `${def.residualCurrent} мА` })
  if (def.breakingCapacity) rows.push({ label: 'Icn', value: `${def.breakingCapacity / 1000} кА` })
  rows.push({ label: 'Терминалов', value: `${selected.value.terminals.length}` })
  return rows
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex shrink-0 items-center justify-between border-b border-white/[.07] px-4 py-3">
      <div>
        <h2 class="text-sm font-extrabold text-white">
          {{ selectedWire ? 'Провод' : panel.selectedCount > 1 ? `Выбрано: ${panel.selectedCount}` : selected ? 'Компонент' : 'Инспектор' }}
        </h2>
        <p class="mt-0.5 text-[9px] text-cloud-400/50">
          {{ selectedWire ? 'Свойства соединения' : panel.selectedCount > 1 ? 'Групповое выделение' : selected ? 'Параметры и настройки линии' : 'Проект и подсказки' }}
        </p>
      </div>
      <button type="button" class="rounded-lg p-1.5 text-cloud-400 transition hover:bg-white/[.06] hover:text-white" @click="emit('settings')">
        <Settings2 :size="14" />
      </button>
    </div>

    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
      <!-- WIRE -->
      <div v-if="selectedWire" class="space-y-4">
        <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] p-3.5">
          <div class="absolute left-0 top-0 h-full w-1" :style="{ backgroundColor: wireColorModel }"></div>
          <p class="font-mono text-[8px] uppercase tracking-[0.16em] text-cloud-400/50">Соединение</p>
          <p class="mt-1 text-sm font-extrabold text-white">{{ WIRE_KIND_LABEL[selectedWire.kind] }}</p>
          <div class="mt-3 space-y-2">
            <div class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" :style="{ backgroundColor: wireColorModel }"></span>
              <div class="min-w-0">
                <p class="text-[8px] uppercase tracking-wider text-cloud-400/40">От</p>
                <p class="truncate text-[9.5px] text-cloud-300">{{ wireEndpoint.from }}</p>
              </div>
            </div>
            <div class="ml-[3px] h-3 border-l border-dashed border-white/15"></div>
            <div class="flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-white/40"></span>
              <div class="min-w-0">
                <p class="text-[8px] uppercase tracking-wider text-cloud-400/40">До</p>
                <p class="truncate text-[9.5px] text-cloud-300">{{ wireEndpoint.to }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <label class="block">
            <span class="field-label !text-cloud-400">Тип проводника</span>
            <select v-model="wireKindModel" class="input !border-white/10 !bg-ink-950/60 !text-white">
              <option v-for="(label, kind) in WIRE_KIND_LABEL" :key="kind" :value="kind">{{ label }}</option>
            </select>
          </label>
          <label v-if="wireKindModel === 'phase'" class="block">
            <span class="field-label !text-cloud-400">Фаза</span>
            <select v-model="wirePhaseModel" class="input !border-white/10 !bg-ink-950/60 !text-white">
              <option value="L1">L1 — жёлтый</option>
              <option value="L2">L2 — зелёный</option>
              <option value="L3">L3 — красный</option>
            </select>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="field-label !text-cloud-400">Сечение, мм²</span>
              <select v-model.number="wireSectionModel" class="input !border-white/10 !bg-ink-950/60 !text-white">
                <option v-for="section in [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25]" :key="section" :value="section">{{ section }}</option>
              </select>
            </label>
            <label class="block">
              <span class="field-label !text-cloud-400">Цвет</span>
              <input v-model="wireColorModel" type="color" class="h-[42px] w-full cursor-pointer rounded-xl border border-white/10 bg-ink-950/60 p-1" />
            </label>
          </div>
        </div>

        <div class="rounded-xl border border-sky-500/20 bg-sky-500/[.05] p-3">
          <p class="flex items-center gap-1.5 text-[9px] font-bold text-sky-300"><Info :size="11" /> Соединение проверено</p>
          <p class="mt-1 text-[8.5px] leading-4 text-sky-200/60">
            Редактор запрещает КЗ фазы на N/PE и объединение N с PE. Изменение типа не отменяет проверку.
          </p>
        </div>

        <button type="button" class="btn-danger w-full !text-[10px]" @click="removeWire">
          <Trash2 :size="13" /> Удалить провод
        </button>
      </div>

      <!-- COMPONENT -->
      <div v-else-if="selected" class="space-y-4">
        <div
          v-if="panel.selectedCount > 1"
          class="rounded-2xl border border-volt-400/25 bg-volt-400/[.07] p-3.5"
        >
          <div class="flex items-center gap-2">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg border border-volt-400/25 bg-volt-400/10 text-volt-300">
              <BoxSelect :size="14" />
            </span>
            <div>
              <p class="text-[10px] font-extrabold text-white">
                {{ panel.selectedCount }}
                {{ pluralize(panel.selectedCount, 'аппарат', 'аппарата', 'аппаратов') }}
              </p>
              <p class="font-mono text-[8px] text-volt-300/70">{{ formatRub(panel.selectedTotalPrice) }}</p>
            </div>
          </div>
          <p class="mt-2.5 text-[9px] leading-4 text-cloud-300/80">
            Перетащите любой выделенный аппарат — вся группа сдвинется по сетке с сохранением взаимного расположения.
            Shift+клик или рамка добавляют аппараты в выделение.
          </p>
          <div class="mt-2.5 flex gap-1.5">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.04] py-1.5 text-[9px] font-bold text-cloud-300 transition hover:text-white"
              @click="panel.clearSelection()"
            >
              Снять выделение
            </button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 py-1.5 text-[9px] font-bold text-rose-300 transition hover:bg-rose-500/15"
              @click="removeSelectedGroup"
            >
              <Trash2 :size="11" /> Удалить группу
            </button>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] p-3.5">
          <div class="absolute left-0 top-0 h-full w-1" :style="{ backgroundColor: selected.def.category === 'rcd' || selected.def.category === 'rcbo' ? '#a3e635' : selected.def.category === 'buses' ? '#38bdf8' : '#f59e0b' }"></div>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-mono text-[8px] uppercase tracking-[0.16em] text-cloud-400/50">{{ CATEGORY_META[selected.def.category].short }} · {{ selected.def.brand }}</p>
              <input
                v-model="nameDraft"
                class="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-extrabold text-white outline-none placeholder:text-cloud-400/30 focus:ring-0"
                placeholder="Название линии"
                @blur="commitName"
                @keyup.enter="commitName"
              />
              <p class="mt-0.5 text-[8.5px] text-cloud-400/50">{{ selected.def.series }}</p>
            </div>
            <span class="shrink-0 rounded-lg border border-volt-400/20 bg-volt-400/10 px-2 py-1 font-mono text-[9px] font-bold text-volt-300">
              {{ formatRub(selected.def.price) }}
            </span>
          </div>
          <div v-if="panel.selectedCount === 1" class="mt-3 flex gap-1.5">
            <button type="button" class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.04] py-1.5 text-[9px] font-bold text-cloud-300 transition hover:text-white" @click="duplicateSelected">
              <Copy :size="11" /> Дублировать
            </button>
            <button type="button" class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[.04] py-1.5 text-[9px] font-bold text-rose-300/80 transition hover:border-rose-500/30 hover:text-rose-300" @click="removeSelected">
              <Trash2 :size="11" /> Удалить
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <div v-for="row in detailRows" :key="row.label" class="rounded-lg border border-white/[.05] bg-white/[.02] px-2.5 py-2">
            <p class="text-[7.5px] uppercase tracking-wider text-cloud-400/40">{{ row.label }}</p>
            <p class="mt-0.5 truncate font-mono text-[9.5px] font-semibold text-cloud-200">{{ row.value }}</p>
          </div>
        </div>

        <div v-if="componentWires.length" class="rounded-xl border border-white/[.06] px-3 py-2">
          <p class="text-[8px] uppercase tracking-wider text-cloud-400/40">Подключено проводов</p>
          <p class="mt-0.5 text-[10px] text-cloud-300">
            {{ componentWires.length }} {{ pluralize(componentWires.length, 'провод', 'провода', 'проводов') }}
            <span class="text-cloud-400/40">· {{ selected.terminals.length }} клемм</span>
          </p>
        </div>

        <template v-if="isProtective">
          <div v-if="activeLine" class="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
            <div class="flex items-center justify-between">
              <p class="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-cloud-400">
                <Gauge :size="11" /> Расчёт линии
              </p>
              <span class="rounded-full px-1.5 py-0.5 font-mono text-[7.5px]" :class="activeLine.status === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : activeLine.status === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'">
                {{ activeLine.status === 'ok' ? 'норма' : activeLine.status === 'warning' ? 'внимание' : 'ошибка' }}
              </span>
            </div>
            <div class="mt-2 grid grid-cols-3 gap-1.5">
              <div><p class="text-[7px] uppercase text-cloud-400/40">Ток</p><p class="font-mono text-[10px] font-bold text-white">{{ formatNumber(activeLine.currentA, 1) }} А</p></div>
              <div><p class="text-[7px] uppercase text-cloud-400/40">Автомат</p><p class="font-mono text-[10px] font-bold text-white">{{ activeLine.ratedCurrent }} А</p></div>
              <div><p class="text-[7px] uppercase text-cloud-400/40">ΔU</p><p class="font-mono text-[10px] font-bold text-white">{{ formatNumber(activeLine.voltageDropPct ?? 0, 1) }}%</p></div>
            </div>
            <p class="mt-2 flex items-center gap-1 text-[8px] text-cloud-400/50">
              <CheckCircle2 v-if="activeLine.status === 'ok'" :size="10" class="text-emerald-400" />
              <AlertTriangle v-else :size="10" class="text-amber-400" />
              {{ activeLine.status === 'ok' ? 'Защита и кабель согласованы' : activeLine.issues[0]?.message }}
            </p>
          </div>

          <section>
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-cloud-400">
                <Zap :size="11" /> Потребители
              </h3>
              <button type="button" class="flex items-center gap-1 text-[8px] font-bold text-volt-300 hover:text-volt-200" @click="emit('add-consumer', selected.placed.uid)">
                <Plus :size="10" /> добавить
              </button>
            </div>
            <div v-if="lineConsumers.length" class="mt-2 space-y-1.5">
              <div v-for="consumer in lineConsumers" :key="consumer.uid" class="group rounded-lg border border-white/[.05] bg-white/[.02] px-2.5 py-2">
                <div class="flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-[9.5px] font-semibold text-cloud-200">{{ consumer.name }}</span>
                  <button type="button" class="text-cloud-400/40 transition hover:text-white" title="Изменить" @click="emit('edit-consumer', consumer)">
                    <Pencil :size="10" />
                  </button>
                  <button type="button" class="text-cloud-400/40 transition hover:text-rose-300" title="Удалить" @click="removeConsumer(consumer)">
                    <Trash2 :size="10" />
                  </button>
                </div>
                <p class="mt-0.5 font-mono text-[7.5px] text-cloud-400/45">
                  {{ formatPower(consumer.powerW) }} · cosφ {{ formatNumber(consumer.cosPhi, 2) }} · Kи {{ formatNumber(consumer.utilization * 100, 0) }}% ·
                  {{ consumer.phase === 3 ? '3 фазы' : consumer.phaseLine }}
                </p>
              </div>
            </div>
            <button v-else type="button" class="mt-2 w-full rounded-lg border border-dashed border-white/10 py-3 text-[8.5px] text-cloud-400/50 transition hover:border-volt-400/30 hover:text-volt-300" @click="emit('add-consumer', selected.placed.uid)">
              + Добавить нагрузку на линию
            </button>
          </section>

          <section class="rounded-xl border border-white/[.06] p-3">
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-cloud-400">
                <Cable :size="11" /> Кабель линии
              </h3>
              <span class="font-mono text-[7.5px] text-cloud-400/40">{{ circuit.cableSection }} мм²</span>
            </div>
            <div class="mt-2 space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">Сечение</span>
                  <select v-model.number="cableSectionModel" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white">
                    <option v-for="section in CABLE_SECTIONS" :key="section" :value="section">{{ section }} мм²</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">Материал</span>
                  <select v-model="materialModel" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white">
                    <option v-for="(label, value) in MATERIAL_LABELS" :key="value" :value="value">{{ label }}</option>
                  </select>
                </label>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">Изоляция</span>
                  <select v-model="insulationModel" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white">
                    <option v-for="(label, value) in INSULATION_LABELS" :key="value" :value="value">{{ label }}</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">Прокладка</span>
                  <select v-model="layingModel" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white">
                    <option v-for="(label, value) in LAYING_LABELS" :key="value" :value="value">{{ label }}</option>
                  </select>
                </label>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">Длина, м</span>
                  <input v-model.number="lengthModel" type="number" min="0" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">В трассе</span>
                  <input v-model.number="groupModel" type="number" min="1" max="8" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[7.5px] uppercase tracking-wider text-cloud-400/40">Темп., °C</span>
                  <input v-model.number="ambientModel" type="number" min="-10" max="60" class="input !rounded-lg !border-white/10 !bg-ink-950/60 !px-2 !py-1.5 !text-[9px] !text-white" />
                </label>
              </div>
            </div>
            <div v-if="activeLine?.ampacity" class="mt-2 flex items-center justify-between rounded-md bg-white/[.03] px-2 py-1.5 text-[7.5px] text-cloud-400/50">
              <span>Iдоп {{ formatNumber(activeLine.ampacity, 1) }} А</span>
              <span>ΔU {{ formatNumber(activeLine.voltageDropPct ?? 0, 2) }}%</span>
              <span :class="(activeLine.voltageDropPct ?? 0) > 5 ? 'text-rose-300' : 'text-emerald-300'">проверка</span>
            </div>
          </section>
        </template>

        <div v-else class="rounded-xl border border-sky-500/20 bg-sky-500/[.05] p-3">
          <p class="flex items-center gap-1.5 text-[9px] font-bold text-sky-300"><Info :size="11" /> Вспомогательный модуль</p>
          <p class="mt-1 text-[8.5px] leading-4 text-sky-200/60">
            Для этого компонента доступны только монтажные соединения. Расчёт потребителей выполняется на защитных автоматах.
          </p>
        </div>

        <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
          <p class="flex items-center gap-1.5 text-[8.5px] font-bold text-cloud-300"><ShieldCheck :size="11" class="text-volt-300" /> Как подключить</p>
          <p class="mt-1 text-[8px] leading-4 text-cloud-400/50">
            Нажмите на клемму на холсте, затем на другую клемму. Цвет провода определится автоматически. Неверные соединения будут заблокированы.
          </p>
        </div>
      </div>

      <!-- PROJECT OVERVIEW -->
      <div v-else class="space-y-4">
        <div class="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <p class="font-mono text-[8px] uppercase tracking-[0.16em] text-volt-300">Проект щита</p>
          <h3 class="mt-1.5 text-base font-extrabold text-white">{{ panel.project.name }}</h3>
          <p class="mt-1 text-[9px] leading-4 text-cloud-400/60">{{ panel.project.description || 'Добавьте описание в параметрах проекта' }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span class="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] text-cloud-300">{{ panel.project.supply.phase === 3 ? '3Ф' : '1Ф' }} · {{ panel.project.supply.voltage }} В</span>
            <span class="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] text-cloud-300">QF {{ panel.project.supply.mainBreaker ?? '—' }} А</span>
            <span class="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] text-cloud-300">{{ panel.layout.rails.length }} рейки</span>
          </div>
          <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-volt-400/20 bg-volt-400/10 py-2 text-[9px] font-bold text-volt-200 transition hover:bg-volt-400/15" @click="emit('settings')">
            <Settings2 :size="11" /> Параметры проекта
          </button>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <p class="font-mono text-lg font-bold text-white">{{ panel.componentCount }}</p>
            <p class="text-[7.5px] uppercase tracking-wider text-cloud-400/40">компонентов</p>
          </div>
          <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <p class="font-mono text-lg font-bold text-white">{{ panel.wireCount }}</p>
            <p class="text-[7.5px] uppercase tracking-wider text-cloud-400/40">проводов</p>
          </div>
          <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <p class="font-mono text-lg font-bold text-volt-300">{{ formatRub(panel.totalPrice) }}</p>
            <p class="text-[7.5px] uppercase tracking-wider text-cloud-400/40">стоимость</p>
          </div>
          <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <p class="font-mono text-lg font-bold text-white">{{ formatPower(panel.calculation.totalCalculatedPowerW) }}</p>
            <p class="text-[7.5px] uppercase tracking-wider text-cloud-400/40">нагрузка</p>
          </div>
        </div>

        <section>
          <h3 class="text-[9px] font-extrabold uppercase tracking-[0.12em] text-cloud-400">Рейки</h3>
          <div class="mt-2 space-y-1.5">
            <div v-for="rail in railsInfo" :key="rail.id" class="rounded-lg border border-white/[.06] bg-white/[.02] px-2.5 py-2">
              <div class="flex items-center justify-between">
                <p class="text-[9px] font-semibold text-cloud-200">{{ rail.name }}</p>
                <span class="font-mono text-[8px] text-cloud-400/50">{{ rail.free }} своб.</span>
              </div>
              <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.06]">
                <div class="h-full rounded-full bg-volt-400/70" :style="{ width: `${(rail.used / rail.capacity) * 100}%` }"></div>
              </div>
            </div>
          </div>
          <button type="button" class="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 py-2 text-[8px] text-cloud-400/50 transition hover:border-volt-400/30 hover:text-volt-300" @click="addRail">
            <Plus :size="10" /> Добавить рейку
          </button>
        </section>

        <div class="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
          <p class="text-[8px] font-extrabold uppercase tracking-wider text-cloud-400">Горячие клавиши</p>
          <div class="mt-2 space-y-1.5 text-[8px] text-cloud-400/50">
            <div class="flex items-center justify-between"><span>Удалить выбранное</span><span class="kbd">Del</span></div>
            <div class="flex items-center justify-between"><span>Отменить / повторить</span><span class="kbd">Ctrl Z</span></div>
            <div class="flex items-center justify-between"><span>Дублировать</span><span class="kbd">Ctrl D</span></div>
            <div class="flex items-center justify-between"><span>Добавить к выделению</span><span class="kbd">Shift</span></div>
            <div class="flex items-center justify-between"><span>Выбрать всё</span><span class="kbd">Ctrl A</span></div>
            <div class="flex items-center justify-between"><span>Панорама</span><span class="kbd">Space</span></div>
          </div>
        </div>

        <div class="rounded-xl border border-volt-400/15 bg-volt-400/[.04] p-3">
          <p class="flex items-center gap-1.5 text-[8.5px] font-bold text-volt-200"><Info :size="11" /> Начните с линии</p>
          <p class="mt-1 text-[8px] leading-4 text-volt-100/50">
            Выберите автомат на холсте, чтобы назначить ему потребителей и кабель. Или добавьте новый из библиотеки.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
