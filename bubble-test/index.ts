import type {
  BubbleHarness,
  BubbleHarnessContext,
  BubbleSemanticAssertions,
  BubbleSemanticQueries,
} from './types'

import { createBubble, type BubbleRuntime } from '../bubble-core'
import { createRenderHarness } from './render-harness'
import { createInternalSemanticAssertions } from './semantic-assertions'
import { createInternalSemanticQueries } from './semantic-queries'
export { createRenderHarness } from './render-harness'
export type {
  BubbleHarness,
  BubbleHarnessContext,
  BubbleRenderContent,
  BubbleRenderElement,
  BubbleRenderHarness,
  BubbleSemanticAssertions,
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

export function createHarness(
  bubble: BubbleRuntime = createBubble()
): BubbleHarness {
  const renderHarness = createRenderHarness(bubble)
  return Object.assign(
    renderHarness,
    createSemanticQueries(renderHarness),
    createSemanticAssertions(renderHarness)
  )
}
