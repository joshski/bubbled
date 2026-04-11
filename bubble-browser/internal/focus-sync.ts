import type { BubbleNodeId, BubbleRuntime } from '../../bubble-core'
import type { DomContainer, DomEvent } from './dom'
import type { DomProjectionState } from './projection-state'

import { isDomElementNode } from './dom'

export interface DomFocusSync {
  syncBubbleFocusToDom(nodeId: BubbleNodeId | null): void
  handleDomFocusEvent(event: DomEvent): void
}

export function createDomFocusSync(options: {
  getContainer: () => DomContainer
  projectionState: DomProjectionState
  bubble: BubbleRuntime
}): DomFocusSync {
  let isSyncingFocusFromBubble = false
  let isSyncingFocusFromDom = false

  return {
    syncBubbleFocusToDom(nodeId) {
      const activeElement = options.getContainer().ownerDocument.activeElement

      if (nodeId === null) {
        if (
          activeElement !== null &&
          options.projectionState.getBubbleNodeId(activeElement) !== undefined
        ) {
          isSyncingFocusFromBubble = true
          activeElement.blur()
          isSyncingFocusFromBubble = false
        }

        return
      }

      const projectedNode = options.projectionState.getProjectedNode(nodeId)

      if (projectedNode === undefined || !isDomElementNode(projectedNode)) {
        return
      }

      if (activeElement === projectedNode) {
        return
      }

      isSyncingFocusFromBubble = true
      projectedNode.focus()
      isSyncingFocusFromBubble = false
    },

    handleDomFocusEvent(event) {
      if (isSyncingFocusFromBubble || isSyncingFocusFromDom) {
        return
      }

      const targetNode = event.target

      if (targetNode === null) {
        return
      }

      const targetId = options.projectionState.getBubbleNodeId(targetNode)

      if (
        targetId === undefined ||
        options.bubble.getFocusedNodeId() === targetId
      ) {
        return
      }

      isSyncingFocusFromDom = true
      options.bubble.focus(targetId)
      isSyncingFocusFromDom = false
    },
  }
}
