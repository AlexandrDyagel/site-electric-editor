import { watchEffect } from 'vue'

interface PageMeta {
  title: string
  description?: string
}

function setMeta(name: string, content: string): void {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }
  element.content = content
}

/** Обновляет title и description для публичных страниц и статей. */
export function usePageMeta(meta: PageMeta | (() => PageMeta)): void {
  watchEffect(() => {
    const value = typeof meta === 'function' ? meta() : meta
    document.title = value.title
    if (value.description) setMeta('description', value.description)
  })
}
