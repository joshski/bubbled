import type { BubbleNodeId } from '../../bubble-core'
import type { DomChildNode, DomElementNode } from './dom'

import { isDomElementNode } from './dom'

const domProjectionStateKey = Symbol('bubble-browser.domProjectionState')

export interface DomProjectionState {
  getBubbleNodeId(node: DomChildNode): BubbleNodeId | undefined
  getProjectedElement(nodeId: BubbleNodeId): DomElementNode | undefined
  getProjectedNode(nodeId: BubbleNodeId): DomChildNode | undefined
  registerProjectedNode(nodeId: BubbleNodeId, node: DomChildNode): void
  clear(): void
}

export function createDomProjectionState(): DomProjectionState {
  const nodeLookup = new Map<BubbleNodeId, DomChildNode>()
  const bubbleIdByDomNode = new Map<DomChildNode, BubbleNodeId>()
  const projectedElements = new Map<BubbleNodeId, DomElementNode>()

  return {
    getBubbleNodeId(node) {
      return bubbleIdByDomNode.get(node)
    },
    getProjectedElement(nodeId) {
      return projectedElements.get(nodeId)
    },
    getProjectedNode(nodeId) {
      return nodeLookup.get(nodeId)
    },
    registerProjectedNode(nodeId, node) {
      nodeLookup.set(nodeId, node)
      bubbleIdByDomNode.set(node, nodeId)

      if (isDomElementNode(node)) {
        projectedElements.set(nodeId, node)
      }
    },
    clear() {
      nodeLookup.clear()
      bubbleIdByDomNode.clear()
      projectedElements.clear()
    },
  }
}

export function attachDomProjectionState(
  projector: object,
  state: DomProjectionState
): void {
  Object.defineProperty(projector, domProjectionStateKey, {
    value: state,
    enumerable: false,
    configurable: false,
    writable: false,
  })
}

export function getDomProjectionState(
  projector: object
): DomProjectionState | undefined {
  return (projector as Record<PropertyKey, unknown>)[domProjectionStateKey] as
    | DomProjectionState
    | undefined
}
