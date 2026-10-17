<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, Calculator, Info, Zap } from 'lucide-vue-next'
import type { LoadConsumer, LoadType, PhaseTag } from '@/types'
import ModalPanel from '@/components/common/ModalPanel.vue'
import FieldShell from '@/components/common/FieldShell.vue'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { currentFromPower } from '@/services/calcEngine'
import { formatCurrent, formatPower, formatRub } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    consumer?: LoadConsumer | null
    defaultComponentUid?: string | null
  }>(),
  { consumer: null, defaultComponentUid: null },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const panel = usePanelStore()
const ui = useUiStore()

const name = ref('')
const powerKw = ref(2.5)
const cosPhi = ref(0.95)
const utilizationPct = ref(80)
const phase = ref<1 | 3>(1)
const phaseLine = ref<PhaseTag>('L1')
const loadType = ref<LoadType>('reactive')
const lineUid = ref('')
const error = ref('')

const lineOptions = computed(() =>
  panel.layout.components
    .filter((component) => component.def.protective && (component.def.category === 'breakers' || component.def.category === 'rcbo'))
    .map((component) => ({
      uid: component.placed.uid,
      name: component.placed.customName ?? component.def.name,
      rating: component.def.ratedCurrent ?? 0,
      curve: component.def.tripCurve ?? 'C',
    })),
)

const selectedLine = computed(() => lineOptions.value.find((line) => line.uid === lineUid.value))

const calculatedCurrent = computed(() =>
  currentFromPower(
    Math.max(0, Number(powerKw.value) || 0) * 1000 * (Math.max(0, Math.min(100, utilizationPct.value)) / 100),
    Math.min(1, Math.max(0.1, Number(cosPhi.value) || 0.95)),
    phase.value,
    panel.project.supply.phase,
    panel.project.supply.voltage,
  ),
)

const lineLoad = computed(() => {
  if (!selectedLine.value) return 0
  const total = panel.calculation.lines.find((line) => line.componentUid === selectedLine.value?.uid)?.currentA ?? 0
  if (!props.consumer) return total
  const editingCurrent = currentFromPower(
    props.consumer.powerW * props.consumer.utilization,
    props.consumer.cosPhi,
    props.consumer.phase,
    panel.project.supply.phase,
    panel.project.supply.voltage,
  )
  return Math.max(0, total - editingCurrent)
})

const resultingLoad = computed(() => lineLoad.value + calculatedCurrent.value)

const isEditing = computed(() => Boolean(props.consumer))

function findLineForConsumer(consumer: LoadConsumer): string {
  const prefix = consumer.wireUidOrTerminalUid.split(':')[0] ?? ''
  const direct = lineOptions.value.find((line) => line.uid === prefix)
  if (direct) return direct.uid
  const wire = panel.project.wires.find((item) => item.uid === consumer.wireUidOrTerminalUid)
  const from = wire?.from.split(':')[0]
  const to = wire?.to.split(':')[0]
  return lineOptions.value.find((line) => line.uid === from || line.uid === to)?.uid ?? lineOptions.value[0]?.uid ?? ''
}

function resetForm(): void {
  error.value = ''
  if (props.consumer) {
    name.value = props.consumer.name
    powerKw.value = props.consumer.powerW / 1000
    cosPhi.value = props.consumer.cosPhi
    utilizationPct.value = Math.round(props.consumer.utilization * 100)
    phase.value = props.consumer.phase
    phaseLine.value = props.consumer.phaseLine
    loadType.value = props.consumer.loadType
    lineUid.value = findLineForConsumer(props.consumer)
  } else {
    name.value = ''
    powerKw.value = 2.5
    cosPhi.value = 0.95
    utilizationPct.value = 80
    phase.value = 1
    phaseLine.value = 'L1'
    loadType.value = 'reactive'
    lineUid.value =
      (props.defaultComponentUid && lineOptions.value.some((line) => line.uid === props.defaultComponentUid)
        ? props.defaultComponentUid
        : lineOptions.value[0]?.uid) ?? ''
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

watch(loadType, (type) => {
  if (type === 'active') cosPhi.value = 1
  else if (cosPhi.value === 1) cosPhi.value = 0.95
})

function save(): void {
  error.value = ''
  if (!lineUid.value) {
    error.value = 'Добавьте на щит автоматический выключатель или дифавтомат'
    return
  }
  if (!name.value.trim()) {
    error.value = 'Укажите название потребителя'
    return
  }
  if (!(Number(powerKw.value) > 0)) {
    error.value = 'Мощность должна быть больше нуля'
    return
  }
  const payload = {
    name: name.value.trim(),
    powerW: Math.round((Number(powerKw.value) || 0) * 1000),
    cosPhi: Math.min(1, Math.max(0.1, Number(cosPhi.value) || 0.95)),
    utilization: Math.min(1, Math.max(0, Number(utilizationPct.value) / 100 || 0)),
    phase: phase.value,
    phaseLine: phaseLine.value,
    loadType: loadType.value,
  }
  if (props.consumer) {
    panel.updateConsumer(props.consumer.uid, payload)
    ui.toast({ title: 'Потребитель обновлён', message: payload.name, tone: 'success' })
  } else {
    const result = panel.addConsumer({ ...payload, componentUid: lineUid.value })
    if (!result.ok) {
      error.value = result.message
      return
    }
    ui.toast({ title: 'Потребитель добавлен', message: payload.name, tone: 'success' })
  }
  emit('saved')
  emit('update:modelValue', false)
}
</script>

<template>
  <ModalPanel
    :model-value="modelValue"
    :title="isEditing ? 'Изменить потребителя' : 'Новый потребитель'"
    description="Нагрузка привязывается к защитной линии и сразу участвует в расчёте."
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="grid gap-5 sm:grid-cols-[1.15fr_.85fr]">
      <div class="space-y-4">
        <div>
          <p class="field-label">Защитная линия</p>
          <select v-model="lineUid" class="select" :disabled="isEditing" :class="isEditing ? 'opacity-60' : ''">
            <option v-if="!lineOptions.length" value="">Нет защитных автоматов</option>
            <option v-for="line in lineOptions" :key="line.uid" :value="line.uid">
              {{ line.name }} · {{ line.curve }}{{ line.rating }}
            </option>
          </select>
          <p v-if="isEditing" class="mt-1 text-[10px] text-ink-400 dark:text-cloud-400/60">
            Для переноса на другую линию удалите и создайте нагрузку заново.
          </p>
        </div>

        <FieldShell label="Название" for-id="load-name" required>
          <input id="load-name" v-model="name" class="input" placeholder="Например, розетки кухни" @keyup.enter="save" />
        </FieldShell>

        <div class="grid grid-cols-2 gap-3">
          <FieldShell label="Мощность" for-id="load-power" suffix="кВт" required>
            <input id="load-power" v-model.number="powerKw" type="number" min="0.01" step="0.1" class="input tabular" />
          </FieldShell>
          <FieldShell label="cosφ" for-id="load-cos">
            <input id="load-cos" v-model.number="cosPhi" type="number" min="0.5" max="1" step="0.01" class="input tabular" />
          </FieldShell>
        </div>

        <FieldShell label="Коэффициент использования" for-id="load-utilization" :hint="`${utilizationPct}% — доля одновременной работы`">
          <div class="flex items-center gap-3">
            <input id="load-utilization" v-model.number="utilizationPct" type="range" min="10" max="100" step="5" />
            <span class="w-12 text-right font-mono text-xs font-bold text-ink-800 dark:text-cloud-200">{{ utilizationPct }}%</span>
          </div>
        </FieldShell>

        <div>
          <p class="field-label">Характер нагрузки</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-xl border px-3 py-2.5 text-left transition"
              :class="loadType === 'active' ? 'border-volt-500 bg-volt-400/10' : 'border-cloud-200 dark:border-white/10'"
              @click="loadType = 'active'"
            >
              <span class="block text-xs font-bold text-ink-800 dark:text-cloud-200">Активная</span>
              <span class="mt-0.5 block text-[9px] text-ink-400 dark:text-cloud-400/60">cosφ ≈ 1</span>
            </button>
            <button
              type="button"
              class="rounded-xl border px-3 py-2.5 text-left transition"
              :class="loadType === 'reactive' ? 'border-volt-500 bg-volt-400/10' : 'border-cloud-200 dark:border-white/10'"
              @click="loadType = 'reactive'"
            >
              <span class="block text-xs font-bold text-ink-800 dark:text-cloud-200">Реактивная</span>
              <span class="mt-0.5 block text-[9px] text-ink-400 dark:text-cloud-400/60">двигатель, БП</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <FieldShell label="Фазность" for-id="load-phase">
            <select id="load-phase" v-model.number="phase" class="select">
              <option :value="1">Однофазная</option>
              <option :value="3">Трёхфазная</option>
            </select>
          </FieldShell>
          <FieldShell label="Фаза подключения" for-id="load-line" :hint="phase === 3 ? 'Распределится по трём фазам' : 'Выберите фазу'">
            <select id="load-line" v-model="phaseLine" class="select" :disabled="phase === 3">
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
            </select>
          </FieldShell>
        </div>

        <p v-if="error" class="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
          {{ error }}
        </p>
      </div>

      <div class="space-y-3">
        <div class="relative overflow-hidden rounded-2xl border border-volt-500/20 bg-ink-900 p-5 text-white">
          <div class="absolute inset-0 bg-grid-dark bg-[size:22px_22px] opacity-40"></div>
          <div class="relative">
            <p class="font-mono text-[9px] uppercase tracking-[0.16em] text-volt-300">Расчётная нагрузка</p>
            <div class="mt-2 flex items-end gap-1.5">
              <span class="font-mono text-4xl font-bold">{{ formatCurrent(calculatedCurrent).replace(' А', '') }}</span>
              <span class="mb-1 font-mono text-sm text-white/40">А</span>
            </div>
            <p class="mt-1 text-[10px] text-cloud-400">{{ formatPower(powerKw * 1000 * (utilizationPct / 100)) }} · {{ phase === 3 ? '3 фазы' : phaseLine }}</p>

            <div class="mt-5 space-y-2 border-t border-white/10 pt-4">
              <div class="flex items-center justify-between text-[9px]">
                <span class="text-cloud-400/60">Линия</span>
                <span class="font-mono text-cloud-200">{{ selectedLine ? `${selectedLine.curve}${selectedLine.rating}` : '—' }}</span>
              </div>
              <div class="flex items-center justify-between text-[9px]">
                <span class="text-cloud-400/60">Ток линии сейчас</span>
                <span class="font-mono text-cloud-200">{{ formatCurrent(lineLoad) }}</span>
              </div>
              <div class="flex items-center justify-between text-[9px]">
                <span class="text-cloud-400/60">После добавления</span>
                <span class="font-mono font-bold" :class="selectedLine && resultingLoad > selectedLine.rating ? 'text-rose-300' : 'text-emerald-300'">
                  {{ formatCurrent(resultingLoad) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-cloud-200 bg-cloud-50/60 p-3.5 dark:border-white/[.07] dark:bg-white/[.02]">
          <p class="flex items-center gap-1.5 text-[10px] font-bold text-ink-700 dark:text-cloud-200"><Calculator :size="12" /> Формула</p>
          <p class="mt-2 font-mono text-[10px] text-ink-600 dark:text-cloud-300">
            I = {{ phase === 3 ? 'P / (√3 × U × cosφ)' : 'P / (Uфазы × cosφ)' }}
          </p>
          <p class="mt-1.5 text-[9px] leading-4 text-ink-400 dark:text-cloud-400/60">
            Используется расчётная мощность с коэффициентом использования. Результат проверяется вместе с остальными линиями.
          </p>
        </div>

        <div v-if="selectedLine && resultingLoad > selectedLine.rating" class="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[.07] p-3">
          <Zap :size="13" class="mt-0.5 shrink-0 text-rose-500" />
          <p class="text-[9px] leading-4 text-rose-700 dark:text-rose-200/80">
            Суммарный ток превысит номинал {{ selectedLine.rating }} А. Увеличьте автомат или уменьшите нагрузку.
          </p>
        </div>

        <div class="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[.06] p-3">
          <Info :size="13" class="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p class="text-[9px] leading-4 text-sky-800/75 dark:text-sky-200/70">
            Линия должна быть защищена автоматом или дифавтоматом. Если список пуст, добавьте защиту на холст.
          </p>
        </div>

        <div v-if="selectedLine" class="flex items-center justify-between rounded-lg border border-cloud-200 px-3 py-2 text-[9px] dark:border-white/[.07]">
          <span class="text-ink-400 dark:text-cloud-400/50">Ориентир по оборудованию</span>
          <span class="font-mono font-bold text-ink-700 dark:text-cloud-200">{{ formatRub(selectedLine.rating * 14 + 200) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('update:modelValue', false)">Отмена</button>
      <button type="button" class="btn-primary" @click="save">
        {{ isEditing ? 'Сохранить изменения' : 'Добавить нагрузку' }}
        <ArrowRight :size="14" />
      </button>
    </template>
  </ModalPanel>
</template>
