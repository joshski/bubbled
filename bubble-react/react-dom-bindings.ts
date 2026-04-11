import type { BubbleEvent } from '../bubble-core'

export const PROPERTY_DEFAULTS = {
  checked: false,
  disabled: false,
  tabIndex: null,
  value: '',
} satisfies Record<string, unknown>

export type BubbleReactPropertyName = keyof typeof PROPERTY_DEFAULTS
export type BubbleReactEventHandler = (event: BubbleEvent) => void

export const EVENT_TYPE_BY_HANDLER_NAME = {
  onChange: 'change',
  onClick: 'click',
} as const

export type BubbleReactEventHandlerName =
  keyof typeof EVENT_TYPE_BY_HANDLER_NAME
