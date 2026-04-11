import type { BubbleStorage } from '../bubble-capabilities'
import type {
  BubbleHarness,
  BubbleHarnessContext,
  BubbleSemanticAssertions,
  BubbleSemanticInteractions,
  BubbleSemanticQueries,
} from './types'

import { createBubble, type BubbleRuntime } from '../bubble-core'
import { createRenderHarness } from './render-harness'
import { createInternalSemanticAssertions } from './semantic-assertions'
import { createInternalSemanticInteractions } from './semantic-interactions'
import { createInternalSemanticQueries } from './semantic-queries'
export { createRenderHarness } from './render-harness'
export type {
  BubbleHarness,
  BubbleHarnessContext,
  BubbleRenderContent,
  BubbleRenderElement,
  BubbleRenderHarness,
  BubbleSemanticAssertions,
  BubbleSemanticInteractions,
  BubbleSemanticQueries,
} from './types'

export function createSemanticQueries(
  target: BubbleHarnessContext
): BubbleSemanticQueries {
  return createInternalSemanticQueries(target)
}

export function createSemanticAssertions(
  target: BubbleHarnessContext
): BubbleSemanticAssertions {
  return createInternalSemanticAssertions(target)
}

export function createSemanticInteractions(
  target: BubbleHarnessContext
): BubbleSemanticInteractions {
  return createInternalSemanticInteractions(target)
}

export function createInMemoryStorage(
  seed: Record<string, string> = {}
): BubbleStorage {
  const entries = new Map<string, string>(Object.entries(seed))
  return {
    getItem(key) {
      return entries.get(key) ?? null
    },
    setItem(key, value) {
      entries.set(key, value)
    },
    removeItem(key) {
      entries.delete(key)
    },
    clear() {
      entries.clear()
    },
  }
}

export function createHarness(
  bubble: BubbleRuntime = createBubble()
): BubbleHarness {
  const renderHarness = createRenderHarness(bubble)
  return Object.assign(
    renderHarness,
    createSemanticQueries(renderHarness),
    createSemanticAssertions(renderHarness),
    createSemanticInteractions(renderHarness)
  )
}
