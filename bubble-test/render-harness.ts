import type { BubbleRenderHarness } from './types'

import { createBubble, type BubbleRuntime } from '../bubble-core'
import {
  dispatchHarnessEvent,
  moveFocusInTabOrder,
} from './render-interactions'
import {
  normalizeRootContent,
  reconcileRenderedRoots,
  type RenderedNode,
} from './render-tree'

export function createRenderHarness(
  bubble: BubbleRuntime = createBubble()
): BubbleRenderHarness {
  let currentBubble = bubble
  let renderedRoots: readonly RenderedNode[] = []

  return {
    get bubble() {
      return currentBubble
    },
    render(content) {
      const rootContent = normalizeRootContent(content)

      renderedRoots = currentBubble.transact(tx => {
        return reconcileRenderedRoots(
          tx,
          currentBubble.rootId,
          renderedRoots,
          rootContent
        )
      })
    },
    cleanup() {
      currentBubble = createBubble()
      renderedRoots = []
    },
    click(target) {
      return dispatchHarnessEvent(currentBubble, target, 'click')
    },
    tab(options = {}) {
      moveFocusInTabOrder(currentBubble, options)
    },
  }
}
