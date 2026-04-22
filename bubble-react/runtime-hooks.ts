import type {
  BubbleCapabilities,
  BubbleCapabilityName,
} from '../bubble-capabilities'
import type { BubbleRuntime } from '../bubble-core'

const RENDER_HOOK_ERROR =
  'Bubble runtime hooks can only be used while rendering a bubbled React component.'

let currentBubbleRuntime: BubbleRuntime | null = null

export function withCurrentBubbleRuntime<T>(
  bubble: BubbleRuntime,
  fn: () => T
): T {
  const previousBubbleRuntime = currentBubbleRuntime
  currentBubbleRuntime = bubble

  try {
    return fn()
  } finally {
    currentBubbleRuntime = previousBubbleRuntime
  }
}

function getCurrentBubbleRuntime(): BubbleRuntime {
  if (currentBubbleRuntime === null) {
    throw new Error(RENDER_HOOK_ERROR)
  }

  return currentBubbleRuntime
}

export function useBubble(): BubbleRuntime {
  return getCurrentBubbleRuntime()
}

export function useBubbleCapability<Name extends BubbleCapabilityName>(
  name: Name
): BubbleCapabilities[Name] {
  return useBubble().resolveCapability(name)
}

export function useStorage(): BubbleCapabilities['storage'] {
  return useBubbleCapability('storage')
}
