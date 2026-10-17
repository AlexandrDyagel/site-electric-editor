<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Trash2, Zap, Info } from 'lucide-vue-next'
import type { TripCurve } from '@/types'
import ModalPanel from '@/components/common/ModalPanel.vue'
import FieldShell from '@/components/common/FieldShell.vue'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { railFreeModules } from '@/services/layoutEngine'
import { MAX_RAILS } from '@/config/editor'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const panel = usePanelStore()
const ui = useUiStore()

const name = ref('')
const description = ref('')
const phase = ref<1 | 3>(3)
const voltage = ref(400)
const mainBreaker = ref<number | ''>(40)
const curve = ref<TripCurve>('C')

const rails = computed(() =>
  panel.project.rails.map((rail) => ({
    ...rail,
    free: railFreeModules(panel.project, rail.id),
    used: rail.capacity - railFreeModules(panel.project, rail.id),
  })),
)

function reset(): void {
  name.value = panel.project.name
  description.value = panel.project.description
  phase.value = panel.project.supply.phase
  voltage.value = panel.project.supply.voltage
  mainBreaker.value = panel.project.supply.mainBreaker ?? ''
  curve.value = panel.project.supply.mainBreakerCurve ?? 'C'
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  },
)

watch(phase, (next) => {
  voltage.value = next === 1 ? 230 : 400
})

function save(): void {
  panel.updateProjectMeta({
    name: name.value,
    description: description.value,
  })
  panel.updateSupply({
    phase: phase.value,
    voltage: Math.max(100, Math.min(1000, Number(voltage.value) || (phase.value === 1 ? 230 : 400))),
    mainBreaker: mainBreaker.value === '' ? undefined : Math.max(1, Number(mainBreaker.value)),
    mainBreakerCurve: curve.value,
  })
  ui.toast({ title: 'Параметры сохранены', tone: 'success' })
  emit('update:modelValue', false)
}

function addRail(): void {
  const result = panel.addRail()
  ui.toast({
    title: result.ok ? 'Рейка добавлена' : 'Не удалось',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function removeRail(railId: string): void {
  const result = panel.removeRail(railId)
  ui.toast({
    title: result.ok ? 'Рейка удалена' : 'Не удалось',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function onRailNameChange(railId: string, event: Event): void {
  const input = event.target as HTMLInputElement
  panel.renameRail(railId, input.value)
}

const totalModules = computed(() =>
  panel.project.components.reduce((sum, component) => {
    const def = panel.layout.components.find((item) => item.placed.uid === component.uid)?.def
    return sum + (def?.sizeModules ?? 0)
  }, 0),
)
</script>

<template>
  <ModalPanel
    :model-value="modelValue"
    title="Параметры проекта"
    description="Питание, название и компоновка DIN-реек."
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Название проекта" for-id="project-name" required>
          <input id="project-name" v-model="name" class="input" placeholder="Щит квартиры" />
        </FieldShell>
        <FieldShell label="Описание" for-id="project-desc">
          <input id="project-desc" v-model="description" class="input" placeholder="Краткое описание" />
        </FieldShell>
      </div>

      <div>
        <p class="field-label">Тип сети</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-xl border px-3 py-3 text-left transition"
            :class="phase === 1 ? 'border-volt-500 bg-volt-400/10' : 'border-cloud-200 hover:border-cloud-300 dark:border-white/10'"
            @click="phase = 1"
          >
            <span class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-ink-800 dark:text-cloud-100">Однофазная</span>
              <Zap :size="13" class="text-volt-600 dark:text-volt-400" />
            </span>
            <span class="mt-0.5 block font-mono text-[10px] text-ink-400 dark:text-cloud-400/60">230 В · L + N + PE</span>
          </button>
          <button
            type="button"
            class="rounded-xl border px-3 py-3 text-left transition"
            :class="phase === 3 ? 'border-volt-500 bg-volt-400/10' : 'border-cloud-200 hover:border-cloud-300 dark:border-white/10'"
            @click="phase = 3"
          >
            <span class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-ink-800 dark:text-cloud-100">Трёхфазная</span>
              <Zap :size="13" class="text-volt-600 dark:text-volt-400" />
            </span>
            <span class="mt-0.5 block font-mono text-[10px] text-ink-400 dark:text-cloud-400/60">400 В · L1/L2/L3 + N + PE</span>
          </button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <FieldShell label="Напряжение" for-id="supply-voltage" suffix="В">
          <input id="supply-voltage" v-model.number="voltage" type="number" min="100" max="1000" class="input tabular" />
        </FieldShell>
        <FieldShell label="Вводной автомат" for-id="main-breaker" suffix="А">
          <input id="main-breaker" v-model.number="mainBreaker" type="number" min="1" max="630" class="input tabular" />
        </FieldShell>
        <FieldShell label="Кривая ввода" for-id="main-curve">
          <select id="main-curve" v-model="curve" class="select">
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </FieldShell>
      </div>

      <div class="rounded-xl border border-sky-500/20 bg-sky-500/[.06] p-3">
        <p class="flex items-center gap-1.5 text-[10px] font-bold text-sky-700 dark:text-sky-300"><Info :size="12" /> При смене фазности</p>
        <p class="mt-1 text-[10px] leading-5 text-sky-800/70 dark:text-sky-200/60">
          Существующие провода и потребители не пересобираются автоматически. Проверьте подключения
          и распределение нагрузок после изменения схемы питания.
        </p>
      </div>

      <div>
        <div class="flex items-center justify-between">
          <div>
            <p class="field-label !mb-0">DIN-рейки</p>
            <p class="mt-0.5 text-[10px] text-ink-400 dark:text-cloud-400/60">{{ panel.project.rails.length }} из {{ MAX_RAILS }} · {{ totalModules }} занятых модулей</p>
          </div>
          <button type="button" class="btn-secondary btn-sm" :disabled="panel.project.rails.length >= MAX_RAILS" @click="addRail">
            <Plus :size="12" /> Добавить
          </button>
        </div>
        <div class="mt-3 space-y-2">
          <div v-for="rail in rails" :key="rail.id" class="flex items-center gap-2 rounded-xl border border-cloud-200 p-2 dark:border-white/[.08]">
            <input
              :value="rail.name"
              class="min-w-0 flex-1 rounded-md border-0 bg-transparent px-2 py-1 text-[12px] font-semibold text-ink-800 outline-none focus:bg-cloud-50 dark:text-cloud-200 dark:focus:bg-white/[.04]"
              @change="onRailNameChange(rail.id, $event)"
            />
            <div class="hidden w-28 sm:block">
              <div class="h-1.5 overflow-hidden rounded-full bg-cloud-200 dark:bg-white/[.08]">
                <div class="h-full rounded-full bg-volt-400" :style="{ width: `${(rail.used / rail.capacity) * 100}%` }"></div>
              </div>
            </div>
            <span class="w-20 text-right font-mono text-[9px] text-ink-400 dark:text-cloud-400/50">{{ rail.used }}/{{ rail.capacity }} мод.</span>
            <button
              type="button"
              class="rounded p-1.5 text-ink-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-25"
              :disabled="panel.project.rails.length <= 1 || rail.used > 0"
              title="Удалить пустую рейку"
              @click="removeRail(rail.id)"
            >
              <Trash2 :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('update:modelValue', false)">Отмена</button>
      <button type="button" class="btn-primary" @click="save">Применить</button>
    </template>
  </ModalPanel>
</template>
