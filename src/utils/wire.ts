import type { PhaseTag, WireKind } from '@/types'

/**
 * Спокойная палитра проводников.
 * L1 — жёлтый, L2 — зелёный, L3 — красный, N — синий.
 * PE отображается двумя цветами: зелёный + жёлтый.
 */
export const PHASE_COLORS: Record<PhaseTag, string> = {
  L1: '#c6ab52',
  L2: '#6f9c63',
  L3: '#b65c5c',
}

export const NEUTRAL_COLOR = '#4d78ae'
export const PE_GREEN = '#7e9b4b'
export const PE_YELLOW = '#c6b35c'
export const JUMPER_COLOR = '#c39a4b'

export const WIRE_COLORS: Record<'phase' | 'neutral' | 'ground' | 'jumper', string> = {
  phase: PHASE_COLORS.L1,
  neutral: NEUTRAL_COLOR,
  ground: PE_GREEN,
  jumper: JUMPER_COLOR,
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
  L1: PHASE_COLORS.L1,
  L2: PHASE_COLORS.L2,
  L3: PHASE_COLORS.L3,
  N: NEUTRAL_COLOR,
  // Градиент объявлен в SVG-холсте редактора.
  PE: 'url(#pe-terminal-gradient)',
}

export const PE_LEGEND_STYLE = `linear-gradient(90deg, ${PE_GREEN} 50%, ${PE_YELLOW} 50%)`
