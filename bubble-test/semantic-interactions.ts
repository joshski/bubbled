import type { BubbleHarnessContext, BubbleSemanticInteractions } from './types'

import { createInternalSemanticQueries } from './semantic-queries'

export function createInternalSemanticInteractions(
  target: BubbleHarnessContext
): BubbleSemanticInteractions {
  const { getByRole } = createInternalSemanticQueries(target)

  return {
    clickByRole(role, options) {
      const nodeId = getByRole(role, options)

      return target.bubble.dispatchEvent({ type: 'click', targetId: nodeId })
    },
    changeByRole(role, options, value) {
      const nodeId = getByRole(role, options)

      return target.bubble.dispatchEvent({
        type: 'change',
        targetId: nodeId,
        data: { value },
      })
    },
  }
}
