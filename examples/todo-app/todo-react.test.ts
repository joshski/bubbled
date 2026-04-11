import { describe, expect, test } from 'vitest'

import type { BubbleEvent } from '../../bubble-core'

import { bubbleEventStringValue } from './todo-react.ts'

function makeBubbleEvent(data: Record<string, unknown>): BubbleEvent {
  return {
    type: 'change',
    targetId: 'test',
    currentTargetId: 'test',
    phase: 'target',
    cancelable: false,
    defaultPrevented: false,
    data,
    preventDefault() {},
    stopPropagation() {},
  }
}

describe('bubbleEventStringValue', () => {
  test('returns the string value from event data', () => {
    expect(bubbleEventStringValue(makeBubbleEvent({ value: 'hello' }))).toBe(
      'hello'
    )
  })

  test('coerces non-string values to string', () => {
    expect(bubbleEventStringValue(makeBubbleEvent({ value: 42 }))).toBe('42')
  })

  test('returns empty string when value is null', () => {
    expect(bubbleEventStringValue(makeBubbleEvent({ value: null }))).toBe('')
  })

  test('returns empty string when value is undefined', () => {
    expect(bubbleEventStringValue(makeBubbleEvent({ value: undefined }))).toBe(
      ''
    )
  })

  test('returns empty string when value key is absent', () => {
    expect(bubbleEventStringValue(makeBubbleEvent({}))).toBe('')
  })
})
