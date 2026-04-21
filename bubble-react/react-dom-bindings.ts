import type { ChangeEventHandler, FormEventHandler } from 'react'

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
  onSubmit: 'submit',
} as const

export type BubbleReactEventHandlerName =
  keyof typeof EVENT_TYPE_BY_HANDLER_NAME

export function valueChangeHandler(
  handler: (value: string) => void
): ChangeEventHandler<HTMLInputElement> {
  const bubbleHandler: BubbleReactEventHandler = event => {
    handler(String(event.data['value'] ?? ''))
  }

  return bubbleHandler as unknown as ChangeEventHandler<HTMLInputElement>
}

export type TextInputProps = {
  readonly value: string
  readonly onChange: ChangeEventHandler<HTMLInputElement>
}

export function textInput(
  value: string,
  onChange: (value: string) => void
): TextInputProps {
  return { value, onChange: valueChangeHandler(onChange) }
}

export function formSubmitHandler(
  handler: () => void
): FormEventHandler<HTMLFormElement> {
  const bubbleHandler: BubbleReactEventHandler = _event => {
    handler()
  }

  return bubbleHandler as unknown as FormEventHandler<HTMLFormElement>
}
