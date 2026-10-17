import type { ComponentCategory } from '@/types'

export const MODULE_WIDTH = 50
export const COMPONENT_HEIGHT = 108
export const COMPONENT_GAP = 2
export const RAIL_X = 48
export const RAIL_BAR_HEIGHT = 18
export const RAIL_STEP = 178
export const RAIL_OFFSET_Y = 64
export const PANEL_PAD = 32
export const DEFAULT_RAIL_CAPACITY = 16
export const MAX_RAILS = 5
export const DRAG_MIME = 'application/x-voltlab-def'

export const CATEGORY_ORDER: ComponentCategory[] = [
  'breakers',
  'rcd',
  'rcbo',
  'protection',
  'metering',
  'buses',
  'accessories',
  'input',
]
