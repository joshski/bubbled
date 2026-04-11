import type {
  BubbleDispatchResult,
  BubbleNodeId,
  BubbleRuntime,
} from '../bubble-core'

export function dispatchHarnessEvent(
  bubble: BubbleRuntime,
  targetId: BubbleNodeId,
  type: string
): BubbleDispatchResult {
  if (bubble.getNode(targetId) === null) {
    throw new Error(
      `Unable to dispatch ${JSON.stringify(type)} event. Unknown node ID: ${targetId}`
    )
  }

  return bubble.dispatchEvent({ type, targetId })
}

export function moveFocusInTabOrder(
  bubble: BubbleRuntime,
  options: { shift?: boolean } = {}
): void {
  const tabOrder = bubble.getTabOrder()

  if (tabOrder.length === 0) {
    return
  }

  const currentFocusId = bubble.getFocusedNodeId()
  const currentIndex =
    currentFocusId === null ? -1 : tabOrder.indexOf(currentFocusId)

  if (options.shift) {
    if (currentIndex === -1) {
      bubble.focus(tabOrder.at(-1)!)
      return
    }

    if (currentIndex === 0) {
      return
    }

    bubble.focus(tabOrder[currentIndex - 1]!)
    return
  }

  if (currentIndex === -1) {
    bubble.focus(tabOrder[0]!)
    return
  }

  if (currentIndex === tabOrder.length - 1) {
    return
  }

  bubble.focus(tabOrder[currentIndex + 1]!)
}
