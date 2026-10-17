import type { Severity, Wire } from '@/types'

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
})

export function formatRub(value: number): string {
  return rubFormatter.format(value)
}

export function formatNumber(value: number, digits?: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '—'
  if (digits !== undefined) {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  }
  return numberFormatter.format(value)
}

export function formatPower(watts: number): string {
  if (watts >= 1000) return `${formatNumber(watts / 1000, 2)} кВт`
  return `${formatNumber(watts, 0)} Вт`
}

export function formatCurrent(amperes: number): string {
  return `${formatNumber(amperes, 1)} А`
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  ok: 'Норма',
  warning: 'Внимание',
  error: 'Ошибка',
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  ok: 'emerald',
  warning: 'amber',
  error: 'rose',
}

export function wirePhaseLabel(wire: Wire): string {
  if (wire.kind === 'neutral') return 'N'
  if (wire.kind === 'ground') return 'PE'
  if (wire.kind === 'jumper') return 'Перемычка'
  return wire.phase ?? 'L'
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
