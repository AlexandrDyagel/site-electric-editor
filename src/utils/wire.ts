import type { PhaseTag, WireKind } from '@/types'

/** Цвета проводников по ПУЭ; для тёмного холста добавлены светлые обводки. */
export const WIRE_COLORS: Record<'phase' | 'neutral' | 'ground' | 'jumper', string> = {
  phase: '#e2b04a',
  neutral: '#4f8cff',
  ground: '#a3e635',
  jumper: '#f59e0b',
}

export const PHASE_COLORS: Record<PhaseTag, string> = {
  L1: '#c97a3a',
  L2: '#66717f',
  L3: '#8b95a5',
}

export function wireColor(kind: WireKind, phase?: PhaseTag): string {
  if (kind === 'phase' && phase) return PHASE_COLORS[phase]
  return WIRE_COLORS[kind]
}

export const WIRE_KIND_LABEL: Record<WireKind, string> = {
  phase: 'Фаза',
  neutral: 'Нейтраль N',
  ground: 'Заземление PE',
  jumper: 'Перемычка',
}

export const TERMINAL_COLORS: Record<string, string> = {
  L1: '#c97a3a',
  L2: '#66717f',
  L3: '#8b95a5',
  N: '#4f8cff',
  PE: '#a3e635',
}
