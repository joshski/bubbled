import type {
  BubbleElementNode,
  BubbleNodeId,
  BubbleRuntime,
} from '../../bubble-core'
import {
  isDomElementNode,
  type DomCheckedElementNode,
  type DomContainer,
  type DomElementNode,
  type DomEvent,
  type DomValueElementNode,
} from './dom'
import type { DomProjectionState } from './projection-state'

function readDomChangeEventData(
  targetNode: DomElementNode,
  target: Readonly<BubbleElementNode>
): Record<string, unknown> {
  if (target.checked !== null) {
    return {
      checked: (targetNode as DomCheckedElementNode).checked,
    }
  }

  if (target.value !== null) {
    return {
      value: (targetNode as DomValueElementNode).value,
    }
  }

  return {}
}

export interface DomEventBridge {
  remove(): void
}

export function createDomEventBridge(
  container: DomContainer,
  bubble: BubbleRuntime,
  projectionState: DomProjectionState
): DomEventBridge {
  const bridgeClickEvent = (event: DomEvent): void => {
    const targetNode = event.target

    if (targetNode === null) {
      return
    }

    const targetId = projectionState.getBubbleNodeId(targetNode)

    if (targetId === undefined) {
      return
    }

    bubble.dispatchEvent({ type: 'click', targetId })
  }

  const bridgeSubmitEvent = (event: DomEvent): void => {
    const targetNode = event.target

    if (targetNode === null) {
      return
    }

    const targetId = projectionState.getBubbleNodeId(targetNode)

    if (targetId === undefined) {
      return
    }

    bubble.dispatchEvent({ type: 'submit', targetId })

    // Native form navigation is outside the bubble runtime; keep the browser
    // on the current document after translating the submit into bubble events.
    event.preventDefault()
  }

  const bridgeChangeEvent = (event: DomEvent): void => {
    const targetNode = event.target

    if (targetNode === null || !isDomElementNode(targetNode)) {
      return
    }

    const targetId = projectionState.getBubbleNodeId(targetNode)

    if (targetId === undefined) {
      return
    }

    const target = bubble.getNode(targetId)

    if (target === null || target.kind !== 'element') {
      return
    }

    bubble.dispatchEvent({
      type: 'change',
      targetId,
      data: readDomChangeEventData(targetNode, target),
    })
  }

  container.addEventListener('click', bridgeClickEvent)
  container.addEventListener('input', bridgeChangeEvent, true)
  container.addEventListener('submit', bridgeSubmitEvent, true)

  return {
    remove() {
      container.removeEventListener('click', bridgeClickEvent)
      container.removeEventListener('input', bridgeChangeEvent, true)
      container.removeEventListener('submit', bridgeSubmitEvent, true)
    },
  }
}
