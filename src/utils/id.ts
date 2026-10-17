let counter = 0

/** Стабильный uid с префиксом: crypto.randomUUID доступен во всех современных браузерах. */
export function createUid(prefix: string): string {
  counter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}

export function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
