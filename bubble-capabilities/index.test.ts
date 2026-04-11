import { describe, expect, test } from 'vitest'

import {
  BubbleUnsupportedCapabilityError,
  createCapabilityRegistry,
} from './index'

describe('createCapabilityRegistry', () => {
  test('resolves a registered capability', () => {
    const clock = {
      now: () => 123,
    }
    const registry = createCapabilityRegistry({ clock })

    expect(registry.resolveCapability('clock')).toBe(clock)
  })

  test('throws a named unsupported capability error for missing capabilities', () => {
    const registry = createCapabilityRegistry()

    expect(() => {
      registry.resolveCapability('clock')
    }).toThrow(BubbleUnsupportedCapabilityError)

    try {
      registry.resolveCapability('clock')
      throw new Error('Expected resolveCapability to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(BubbleUnsupportedCapabilityError)
      expect(error).toMatchObject({
        name: 'BubbleUnsupportedCapabilityError',
        capabilityName: 'clock',
        message: 'Bubble capability "clock" is not supported by this runtime.',
      })
    }
  })
})
