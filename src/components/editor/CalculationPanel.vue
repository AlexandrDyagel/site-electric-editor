<script setup lang="ts">
import { computed } from 'vue'
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  Download,
  Gauge,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-vue-next'
import type { LoadConsumer, Severity } from '@/types'
import { usePanelStore } from '@/stores/panelStore'
import { useUiStore } from '@/stores/uiStore'
import { formatNumber, formatPower, formatRub, pluralize } from '@/utils/format'
import { PHASE_COLORS } from '@/utils/wire'

const emit = defineEmits<{
  'add-consumer': [componentUid?: string]
  'edit-consumer': [consumer: LoadConsumer]
  export: []
  settings: []
}>()

const panel = usePanelStore()
const ui = useUiStore()

const calc = computed(() => panel.calculation)
const project = computed(() => panel.project)
const maxPhaseCurrent = computed(() =>
  Math.max(1, ...calc.value.phases.map((phase) => phase.currentA)),
)
const errorCount = computed(
  () => calc.value.issues.filter((issue) => issue.severity === 'error').length,
)
const warningCount = computed(
  () => calc.value.issues.filter((issue) => issue.severity === 'warning').length,
)
const sortedIssues = computed(() =>
  [...calc.value.issues].sort((a, b) => (a.severity === 'error' ? -1 : 1) - (b.severity === 'error' ? -1 : 1)),
)

const phaseColor = PHASE_COLORS

const linePower = (componentUid: string): number => {
  return project.value.consumers
    .filter((consumer) => isConsumerOfLine(consumer, componentUid))
    .reduce((sum, consumer) => sum + consumer.powerW * consumer.utilization, 0)
}

function isConsumerOfLine(consumer: LoadConsumer, componentUid: string): boolean {
  if (consumer.wireUidOrTerminalUid.startsWith(`${componentUid}:`)) return true
  const wire = project.value.wires.find((item) => item.uid === consumer.wireUidOrTerminalUid)
  if (!wire) return false
  return wire.from.startsWith(`${componentUid}:`) || wire.to.startsWith(`${componentUid}:`)
}

function consumersOfLine(componentUid: string): LoadConsumer[] {
  return project.value.consumers.filter((consumer) => isConsumerOfLine(consumer, componentUid))
}

function selectLine(componentUid: string): void {
  panel.selectComponent(componentUid)
}

function removeConsumer(consumer: LoadConsumer): void {
  const result = panel.removeConsumer(consumer.uid)
  ui.toast({
    title: result.ok ? 'Потребитель удалён' : 'Не удалось удалить',
    message: result.message,
    tone: result.ok ? 'success' : 'error',
  })
}

function selectIssueComponent(componentUid?: string): void {
  if (componentUid) panel.selectComponent(componentUid)
}

function loadPct(rated: number, current: number): number {
  if (rated <= 0) return 0
  return Math.min(100, (current / rated) * 100)
}

function severityDot(severity: Severity): string {
  if (severity === 'error') return 'bg-rose-400'
  if (severity === 'warning') return 'bg-amber-400'
  return 'bg-emerald-400'
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex shrink-0 items-center justify-between border-b border-white/[.07] px-4 py-3">
      <div>
        <h2 class="flex items-center gap-2 text-sm font-extrabold text-white">
          Расчёт щита
          <span class="rounded-full border border-white/10 bg-white/[.04] px-1.5 py-0.5 font-mono text-[7px] text-cloud-400">
            real-time
          </span>
        </h2>
        <p class="mt-0.5 text-[9px] text-cloud-400/50">Пересчитывается при каждом изменении</p>
      </div>
      <button type="button" class="rounded-lg p-1.5 text-cloud-400 transition hover:bg-white/[.06] hover:text-white" title="Параметры щита" @click="emit('settings')">
        <Settings2 :size="14" />
      </button>
    </div>

    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <section class="border-b border-white/[.06] p-4">
        <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.015] p-3.5">
          <div class="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-volt-400/10 blur-2xl"></div>
          <div class="relative">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.15em] text-volt-300">
                <Activity :size="11" /> состояние схемы
              </span>
              <span class="inline-flex items-center gap-1 text-[9px] font-bold" :class="calc.status === 'ok' ? 'text-emerald-300' : calc.status === 'warning' ? 'text-amber-300' : 'text-rose-300'">
                <span class="h-1.5 w-1.5 rounded-full" :class="severityDot(calc.status)"></span>
                {{ calc.status === 'ok' ? 'Норма' : calc.status === 'warning' ? 'Внимание' : 'Ошибка' }}
              </span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <p class="text-[8px] uppercase tracking-wider text-cloud-400/50">Расчётная мощность</p>
                <p class="mt-1 font-mono text-lg font-bold text-white">{{ formatPower(calc.totalCalculatedPowerW) }}</p>
              </div>
              <div>
                <p class="text-[8px] uppercase tracking-wider text-cloud-400/50">Ток щита</p>
                <p class="mt-1 font-mono text-lg font-bold text-white">{{ formatNumber(calc.totalCurrentA, 1) }} <span class="text-xs text-cloud-400">А</span></p>
              </div>
              <div>
                <p class="text-[8px] uppercase tracking-wider text-cloud-400/50">Установленная</p>
                <p class="mt-1 font-mono text-xs font-semibold text-cloud-300">{{ formatPower(calc.totalInstalledPowerW) }}</p>
              </div>
              <div>
                <p class="text-[8px] uppercase tracking-wider text-cloud-400/50">cosφ средний</p>
                <p class="mt-1 font-mono text-xs font-semibold text-cloud-300">{{ formatNumber(calc.averageCosPhi, 2) }}</p>
              </div>
            </div>
            <div v-if="calc.mainBreaker" class="mt-3">
              <div class="flex items-center justify-between text-[8px]">
                <span class="text-cloud-400/50">Ввод {{ calc.mainBreaker }} А</span>
                <span class="font-mono" :class="calc.mainBreakerStatus === 'error' ? 'text-rose-300' : calc.mainBreakerStatus === 'warning' ? 'text-amber-300' : 'text-emerald-300'">
                  {{ formatNumber(calc.mainBreakerUtilizationPct ?? 0, 0) }}%
                </span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.08]">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="calc.mainBreakerStatus === 'error' ? 'bg-rose-400' : calc.mainBreakerStatus === 'warning' ? 'bg-amber-400' : 'bg-volt-400'"
                  :style="{ width: `${Math.min(100, calc.mainBreakerUtilizationPct ?? 0)}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="rounded-lg border border-white/[.06] bg-white/[.02] p-2 text-center">
            <p class="font-mono text-sm font-bold text-white">{{ panel.componentCount }}</p>
            <p class="text-[7px] uppercase tracking-wider text-cloud-400/40">компонентов</p>
          </div>
          <div class="rounded-lg border border-white/[.06] bg-white/[.02] p-2 text-center">
            <p class="font-mono text-sm font-bold text-white">{{ calc.lines.length }}</p>
            <p class="text-[7px] uppercase tracking-wider text-cloud-400/40">линий</p>
          </div>
          <div class="rounded-lg border border-white/[.06] bg-white/[.02] p-2 text-center">
            <p class="font-mono text-sm font-bold text-volt-300">{{ formatRub(panel.totalPrice) }}</p>
            <p class="text-[7px] uppercase tracking-wider text-cloud-400/40">смета</p>
          </div>
        </div>
      </section>

      <section v-if="project.supply.phase === 3" class="border-b border-white/[.06] p-4">
        <div class="flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-cloud-400">
            <TrendingUp :size="12" /> Баланс фаз
          </h3>
          <span
            class="rounded-full px-2 py-0.5 font-mono text-[8px] font-bold"
            :class="calc.imbalanceStatus === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : calc.imbalanceStatus === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'"
          >
            перекос {{ formatNumber(calc.imbalancePct, 1) }}%
          </span>
        </div>
        <div class="mt-3 space-y-2.5">
          <div v-for="phase in calc.phases" :key="phase.phase" class="flex items-center gap-2.5">
            <span class="w-5 font-mono text-[9px] font-bold" :style="{ color: phaseColor[phase.phase] }">{{ phase.phase }}</span>
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.07]">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${(phase.currentA / maxPhaseCurrent) * 100}%`, backgroundColor: phaseColor[phase.phase] }"
              ></div>
            </div>
            <span class="w-14 text-right font-mono text-[9px] text-cloud-300">{{ formatNumber(phase.currentA, 1) }} А</span>
            <span class="w-8 text-right font-mono text-[8px] text-cloud-400/40">{{ formatNumber(phase.sharePct, 0) }}%</span>
          </div>
        </div>
        <p class="mt-2 text-[8px] leading-4 text-cloud-400/40">
          {{ calc.imbalanceStatus === 'ok' ? 'Нагрузка распределена в пределах нормы (до 15%).' : 'Рекомендуется перераспределить однофазные линии между фазами.' }}
        </p>
      </section>

      <section class="border-b border-white/[.06]">
        <div class="flex items-center justify-between px-4 pt-4">
          <h3 class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-cloud-400">
            <Gauge :size="12" /> Линии и потребители
          </h3>
          <button type="button" class="flex items-center gap-1 text-[8px] font-bold text-volt-300 hover:text-volt-200" @click="emit('add-consumer')">
            <Plus :size="10" /> добавить
          </button>
        </div>
        <div class="mt-2 space-y-1.5 px-3 pb-4">
          <div
            v-for="line in calc.lines"
            :key="line.componentUid"
            class="rounded-xl border border-white/[.06] bg-white/[.02] p-2.5 transition hover:border-white/15"
          >
            <div class="flex items-start gap-2">
              <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" :class="severityDot(line.status)"></span>
              <button type="button" class="min-w-0 flex-1 text-left" @click="selectLine(line.componentUid)">
                <div class="flex items-start justify-between gap-2">
                  <p class="truncate text-[10.5px] font-bold text-cloud-100">{{ line.name }}</p>
                  <span class="shrink-0 font-mono text-[8px]" :class="line.status === 'error' ? 'text-rose-300' : line.status === 'warning' ? 'text-amber-300' : 'text-cloud-400/50'">
                    {{ formatNumber(line.currentA, 1) }}/{{ line.ratedCurrent }} А
                  </span>
                </div>
                <div class="mt-1 flex items-center justify-between gap-2">
                  <p class="text-[8px] text-cloud-400/50">
                    {{ formatPower(linePower(line.componentUid)) }} · {{ line.cableSection }} мм² · ΔU {{ formatNumber(line.voltageDropPct ?? 0, 1) }}%
                  </p>
                  <span class="font-mono text-[7px] text-cloud-400/35">{{ line.consumerCount }} {{ pluralize(line.consumerCount, 'нагр.', 'нагр.', 'нагр.') }}</span>
                </div>
                <div class="mt-1.5 flex items-center gap-2">
                  <div class="h-1 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="line.status === 'error' ? 'bg-rose-400' : line.status === 'warning' ? 'bg-amber-400' : 'bg-volt-400/80'"
                      :style="{ width: `${loadPct(line.ratedCurrent, line.currentA)}%` }"
                    ></div>
                  </div>
                  <button type="button" class="rounded p-0.5 text-cloud-400/40 hover:text-volt-300" title="Добавить нагрузку" @click.stop="emit('add-consumer', line.componentUid)">
                    <Plus :size="10" />
                  </button>
                </div>
              </button>
            </div>

            <div v-if="consumersOfLine(line.componentUid).length" class="mt-2 space-y-1 border-t border-white/[.05] pt-1.5">
              <div
                v-for="consumer in consumersOfLine(line.componentUid)"
                :key="consumer.uid"
                class="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-white/[.03]"
              >
                <span class="h-1 w-1 shrink-0 rounded-full bg-cloud-400/30"></span>
                <span class="min-w-0 flex-1 truncate text-[8.5px] text-cloud-400/70">{{ consumer.name }}</span>
                <span class="shrink-0 font-mono text-[7.5px] text-cloud-400/40">{{ formatPower(consumer.powerW) }}</span>
                <button type="button" class="text-cloud-400/30 opacity-0 transition group-hover:opacity-100 hover:text-white" title="Изменить" @click="emit('edit-consumer', consumer)">
                  <Pencil :size="9" />
                </button>
                <button type="button" class="text-cloud-400/30 opacity-0 transition group-hover:opacity-100 hover:text-rose-300" title="Удалить" @click="removeConsumer(consumer)">
                  <Trash2 :size="9" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="calc.lines.length === 0" class="rounded-xl border border-dashed border-white/10 py-5 text-center">
            <p class="text-[9px] text-cloud-400/50">Нет назначенных нагрузок</p>
            <button type="button" class="mt-2 text-[9px] font-bold text-volt-300" @click="emit('add-consumer')">Добавить потребителя</button>
          </div>
        </div>
      </section>

      <section class="border-b border-white/[.06] p-4">
        <h3 class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-cloud-400">
          <ShieldCheck :size="12" /> Дифференциальная защита
        </h3>
        <div v-if="calc.rcds.length" class="mt-2.5 space-y-1.5">
          <div v-for="rcd in calc.rcds" :key="rcd.componentUid" class="rounded-xl border border-white/[.06] bg-white/[.02] p-2.5">
            <div class="flex items-center justify-between gap-2">
              <button type="button" class="min-w-0 flex-1 truncate text-left text-[9.5px] font-bold text-cloud-200 hover:text-white" @click="selectLine(rcd.componentUid)">
                {{ rcd.name }}
              </button>
              <span class="rounded px-1.5 py-0.5 font-mono text-[7.5px]" :class="rcd.status === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : rcd.status === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'">
                {{ rcd.ratedResidualMa }} мА
              </span>
            </div>
            <div class="mt-1.5 flex items-center justify-between text-[8px] text-cloud-400/50">
              <span>Утечка {{ formatNumber(rcd.leakageMa, 1) }} мА · нужно ≥ {{ formatNumber(rcd.requiredResidualMa, 0) }} мА</span>
              <span>{{ rcd.circuits }} лин.</span>
            </div>
            <div class="mt-1 flex items-center gap-1.5">
              <div class="h-1 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                <div
                  class="h-full rounded-full"
                  :class="rcd.status === 'error' ? 'bg-rose-400' : rcd.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'"
                  :style="{ width: `${Math.min(100, (rcd.leakageMa / Math.max(rcd.ratedResidualMa, 1)) * 100)}%` }"
                ></div>
              </div>
              <span class="font-mono text-[7px] text-cloud-400/40">{{ formatNumber((rcd.leakageMa / Math.max(rcd.ratedResidualMa, 1)) * 100, 0) }}%</span>
            </div>
          </div>
        </div>
        <p v-else class="mt-2 text-[9px] text-cloud-400/50">В схеме нет УЗО или дифавтоматов.</p>
      </section>

      <section class="border-b border-white/[.06] p-4">
        <h3 class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-cloud-400">
          <ArrowDownToLine :size="12" /> Селективность
        </h3>
        <div v-if="calc.selectivity.length" class="mt-2 space-y-1.5">
          <div v-for="check in calc.selectivity" :key="`${check.downstreamUid}-${check.upstreamUid}`" class="flex items-start gap-2 rounded-lg border border-white/[.05] px-2 py-1.5">
            <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" :class="severityDot(check.status)"></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[8.5px] font-semibold text-cloud-300">{{ check.downstreamName }} → {{ check.upstreamName }}</p>
              <p class="mt-0.5 font-mono text-[7.5px] text-cloud-400/40">{{ check.downstreamRating }} А / {{ check.upstreamRating }} А = ×{{ check.ratio }}</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-2 text-[9px] text-cloud-400/50">Недостаточно данных для проверки цепочки защит.</p>
      </section>

      <section class="p-4">
        <div class="flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-cloud-400">
            <AlertTriangle :size="12" /> Проверки
          </h3>
          <span class="font-mono text-[8px] text-cloud-400/40">
            <span class="text-rose-300">{{ errorCount }}</span> / <span class="text-amber-300">{{ warningCount }}</span>
          </span>
        </div>
        <div v-if="sortedIssues.length" class="mt-2 space-y-1.5">
          <button
            v-for="(issue, index) in sortedIssues.slice(0, 14)"
            :key="`${issue.code}-${index}`"
            type="button"
            class="flex w-full items-start gap-2 rounded-lg border px-2 py-2 text-left transition hover:bg-white/[.04]"
            :class="issue.severity === 'error' ? 'border-rose-500/20 bg-rose-500/[.04]' : 'border-amber-500/15 bg-amber-500/[.03]'"
            @click="selectIssueComponent(issue.componentUid)"
          >
            <span class="mt-0.5 shrink-0" :class="issue.severity === 'error' ? 'text-rose-400' : 'text-amber-400'">
              <AlertTriangle :size="11" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[8.5px] font-bold" :class="issue.severity === 'error' ? 'text-rose-200' : 'text-amber-200'">{{ issue.title }}</span>
              <span class="mt-0.5 block text-[8px] leading-4 text-cloud-400/60">{{ issue.message }}</span>
            </span>
            <ChevronRight v-if="issue.componentUid" :size="10" class="mt-0.5 shrink-0 text-cloud-400/30" />
          </button>
          <p v-if="sortedIssues.length > 14" class="text-[8px] text-cloud-400/40">И ещё {{ sortedIssues.length - 14 }} проверок…</p>
        </div>
        <div v-else class="mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] p-2.5">
          <CheckCircle2 :size="14" class="shrink-0 text-emerald-400" />
          <div>
            <p class="text-[9px] font-bold text-emerald-200">Все проверки пройдены</p>
            <p class="text-[8px] text-emerald-300/60">Нагрузка, кабели и защиты согласованы.</p>
          </div>
        </div>
      </section>
    </div>

    <div class="shrink-0 border-t border-white/[.07] p-3">
      <button type="button" class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[.04] py-2 text-[9px] font-bold text-cloud-300 transition hover:border-volt-400/30 hover:text-white" @click="emit('export')">
        <Download :size="12" /> Спецификация и экспорт
        <Zap :size="10" class="text-volt-300" />
      </button>
    </div>
  </div>
</template>
