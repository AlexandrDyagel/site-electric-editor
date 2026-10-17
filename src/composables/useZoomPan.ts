import { computed, reactive, ref, type Ref } from 'vue'
import { clamp } from '@/utils/geometry'

export interface PanZoomView {
  x: number
  y: number
  scale: number
}

export interface WorldSize {
  width: number
  height: number
}

/**
 * Зум и панорамирование рабочей области.
 * Храним только translate/scale — SVG-сцена остаётся декларативной.
 */
export function useZoomPan(container: Ref<HTMLElement | null>, getWorld: () => WorldSize) {
  const view = reactive<PanZoomView>({ x: 0, y: 0, scale: 1 })
  const isPanning = ref(false)
  const panStart = reactive({ x: 0, y: 0, originX: 0, originY: 0 })
  const minScale = 0.3
  const maxScale = 2.6

  function fit(padding = 40): void {
    const element = container.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    const world = getWorld()
    if (rect.width === 0 || rect.height === 0 || world.width === 0) return
    const scale = clamp(
      Math.min((rect.width - padding * 2) / world.width, (rect.height - padding * 2) / world.height),
      minScale,
      1.25,
    )
    view.scale = Number(scale.toFixed(3))
    view.x = Math.round((rect.width - world.width * scale) / 2)
    view.y = Math.round(Math.max(14, (rect.height - world.height * scale) / 2))
  }

  function zoomAtPoint(localX: number, localY: number, factor: number): void {
    const worldX = (localX - view.x) / view.scale
    const worldY = (localY - view.y) / view.scale
    const next = clamp(view.scale * factor, minScale, maxScale)
    view.scale = Number(next.toFixed(3))
    view.x = localX - worldX * view.scale
    view.y = localY - worldY * view.scale
  }

  function zoomAtClient(clientX: number, clientY: number, factor: number): void {
    const element = container.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    zoomAtPoint(clientX - rect.left, clientY - rect.top, factor)
  }

  function zoomIn(): void {
    const element = container.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    zoomAtPoint(rect.width / 2, rect.height / 2, 1.18)
  }

  function zoomOut(): void {
    const element = container.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    zoomAtPoint(rect.width / 2, rect.height / 2, 1 / 1.18)
  }

  function beginPan(clientX: number, clientY: number): void {
    isPanning.value = true
    panStart.x = clientX
    panStart.y = clientY
    panStart.originX = view.x
    panStart.originY = view.y
  }

  function updatePan(clientX: number, clientY: number): void {
    if (!isPanning.value) return
    view.x = panStart.originX + (clientX - panStart.x)
    view.y = panStart.originY + (clientY - panStart.y)
  }

  function endPan(): void {
    isPanning.value = false
  }

  function screenToWorld(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    }
  }

  const zoomPercent = computed(() => Math.round(view.scale * 100))
  const canZoomIn = computed(() => view.scale < maxScale - 0.001)
  const canZoomOut = computed(() => view.scale > minScale + 0.001)

  return {
    view,
    isPanning,
    zoomPercent,
    canZoomIn,
    canZoomOut,
    fit,
    zoomIn,
    zoomOut,
    zoomAtClient,
    zoomAtPoint,
    beginPan,
    updatePan,
    endPan,
    screenToWorld,
  }
}
