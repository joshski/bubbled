import type {
  BubbleDispatchResult,
  BubbleElementNode,
  BubbleNode,
  BubbleNodeId,
  BubbleRuntimeEvent,
} from './index'

import { getTabIndexValue, isTabbableElement } from './dom-semantics'

type BubbleEventDispatchMode = 'propagating' | 'target-only'

interface CreateBubbleFocusNavigationOptions {
  rootId: BubbleNodeId
  getNodes(): ReadonlyMap<BubbleNodeId, BubbleNode>
  dispatchEvent(input: {
    type: string
    targetId: BubbleNodeId
    data?: Record<string, unknown>
    cancelable?: boolean
    mode?: BubbleEventDispatchMode
  }): BubbleDispatchResult
  emitRuntimeEvent(event: BubbleRuntimeEvent): void
}

export interface BubbleFocusNavigation {
  focus(id: BubbleNodeId): void
  blur(): void
  getFocusedNodeId(): BubbleNodeId | null
  getTabOrder(): readonly BubbleNodeId[]
}

const FOCUSABLE_HTML_TAGS = new Set(['button', 'input', 'select', 'textarea'])

function assertFocusableNode(
  node: BubbleNode,
  nodeId: BubbleNodeId
): asserts node is BubbleElementNode {
  if (node.kind !== 'element') {
    throw new Error(`Only element nodes can receive focus: ${nodeId}`)
  }

  if (node.namespace !== 'html' || !FOCUSABLE_HTML_TAGS.has(node.tag)) {
    throw new Error(`Node is not focusable: ${nodeId}`)
  }
}

export function createBubbleFocusNavigation({
  rootId,
  getNodes,
  dispatchEvent,
  emitRuntimeEvent,
}: CreateBubbleFocusNavigationOptions): BubbleFocusNavigation {
  let focusedNodeId: BubbleNodeId | null = null

  const getTabOrder = (): readonly BubbleNodeId[] => {
    const visitedElementIds: BubbleNodeId[] = []

    const visitNode = (nodeId: BubbleNodeId): void => {
      const node = getNodes().get(nodeId) as BubbleNode

      if (node.kind === 'element') {
        visitedElementIds.push(nodeId)
      }

      if (node.kind === 'text') {
        return
      }

      for (const childId of node.children) {
        visitNode(childId)
      }
    }

    visitNode(rootId)

    const tabbableEntries = visitedElementIds
      .map((nodeId, domIndex) => {
        const node = getNodes().get(nodeId) as BubbleElementNode

        if (!isTabbableElement(node)) {
          return null
        }

        return {
          nodeId,
          domIndex,
          tabIndex: getTabIndexValue(node) ?? 0,
        }
      })
      .filter(
        (
          entry
        ): entry is {
          nodeId: BubbleNodeId
          domIndex: number
          tabIndex: number
        } => entry !== null
      )

    const positiveTabIndexEntries = tabbableEntries
      .filter(entry => entry.tabIndex > 0)
      .sort(
        (left, right) =>
          left.tabIndex - right.tabIndex || left.domIndex - right.domIndex
      )
    const naturalTabIndexEntries = tabbableEntries.filter(
      entry => entry.tabIndex === 0
    )

    return Object.freeze([
      ...positiveTabIndexEntries.map(entry => entry.nodeId),
      ...naturalTabIndexEntries.map(entry => entry.nodeId),
    ])
  }

  return {
    focus(id) {
      const node = getNodes().get(id)

      if (node === undefined) {
        throw new Error(`Unknown node ID: ${id}`)
      }

      assertFocusableNode(node, id)
      if (focusedNodeId === id) {
        return
      }

      if (focusedNodeId !== null) {
        dispatchEvent({
          type: 'blur',
          targetId: focusedNodeId,
          mode: 'target-only',
        })
      }

      focusedNodeId = id
      dispatchEvent({
        type: 'focus',
        targetId: id,
        mode: 'target-only',
      })
      emitRuntimeEvent({ type: 'focus-changed', nodeId: id })
    },
    blur() {
      if (focusedNodeId === null) {
        return
      }

      const previouslyFocusedNodeId = focusedNodeId
      focusedNodeId = null
      dispatchEvent({
        type: 'blur',
        targetId: previouslyFocusedNodeId,
        mode: 'target-only',
      })
      emitRuntimeEvent({ type: 'focus-changed', nodeId: null })
    },
    getFocusedNodeId() {
      return focusedNodeId
    },
    getTabOrder,
  }
}
