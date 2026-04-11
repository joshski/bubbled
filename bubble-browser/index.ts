import type {
  BubbleElementNode,
  BubbleMutation,
  BubbleNode,
  BubbleNodeId,
  BubbleRootNode,
  BubbleRuntime,
  BubbleRuntimeEvent,
} from '../bubble-core'

import {
  isDomElementNode,
  type DomCheckedElementNode,
  type DomChildNode,
  type DomContainer,
  type DomDocument,
  type DomElementNode,
  type DomEvent,
  type DomTextNode,
  type DomValueElementNode,
} from './internal/dom'
import { createDomFocusSync, type DomFocusSync } from './internal/focus-sync'
import {
  createDomLayout,
  measureAndPlacePopover,
  placePopover,
  type PlacementInput,
  type PlacementOutput,
} from './internal/layout'
import {
  attachDomProjectionState,
  createDomProjectionState,
} from './internal/projection-state'

export interface BubbleDomProjector {
  mount(container: HTMLElement): void
  unmount(): void
}

export interface CreateDomProjectorOptions {
  bubble: BubbleRuntime
  bridgeEvents?: boolean
  syncFocus?: boolean
}

function setDomProperty(
  node: DomElementNode,
  name: string,
  value: unknown
): void {
  ;(node as unknown as Record<string, unknown>)[name] = value
}

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

export {
  createDomLayout,
  measureAndPlacePopover,
  placePopover,
  type PlacementInput,
  type PlacementOutput,
}

function getBubbleNode(
  bubble: BubbleRuntime,
  nodeId: BubbleNodeId
): Readonly<BubbleNode> {
  const node = bubble.getNode(nodeId)

  if (node === null) {
    throw new Error(`Unknown node ID: ${nodeId}`)
  }

  return node
}

function getBubbleContainerNode(
  bubble: BubbleRuntime,
  nodeId: BubbleNodeId
): Readonly<BubbleRootNode | BubbleElementNode> {
  const node = getBubbleNode(bubble, nodeId)

  if (node.kind === 'text') {
    throw new Error(`Text nodes cannot have children: ${nodeId}`)
  }

  return node
}

export function createDomProjector(
  options: CreateDomProjectorOptions
): BubbleDomProjector {
  let mountedContainer: DomContainer | null = null
  let unsubscribe: (() => void) | null = null
  let removeDomEventBridges: (() => void) | null = null
  const projectionState = createDomProjectionState()
  const focusSync: DomFocusSync | null =
    options.syncFocus === true
      ? createDomFocusSync({
          getContainer: () => mountedContainer as DomContainer,
          projectionState,
          bubble: options.bubble,
        })
      : null

  const ensureProjectedNode = (
    nodeId: BubbleNodeId,
    document: DomDocument
  ): DomChildNode => {
    const existingNode = projectionState.getProjectedNode(nodeId)

    if (existingNode !== undefined) {
      return existingNode
    }

    const node = getBubbleNode(options.bubble, nodeId)

    if (node.kind === 'text') {
      const textNode = document.createTextNode(node.value)

      projectionState.registerProjectedNode(nodeId, textNode)
      return textNode
    }

    if (node.kind !== 'element') {
      throw new Error(`Cannot project bubble root node ${nodeId} into the DOM.`)
    }

    const element = document.createElement(node.tag)

    projectionState.registerProjectedNode(nodeId, element)

    if (focusSync !== null) {
      element.addEventListener('focus', focusSync.handleDomFocusEvent)
    }

    for (const [name, value] of Object.entries(node.attributes)) {
      element.setAttribute(name, value)
    }

    for (const [name, value] of Object.entries(node.properties)) {
      setDomProperty(element, name, value)
    }

    for (const childId of node.children) {
      element.appendChild(ensureProjectedNode(childId, document))
    }

    return element
  }

  const getParentNode = (
    parentId: BubbleNodeId
  ): DomContainer | DomElementNode => {
    if (parentId === options.bubble.rootId) {
      return mountedContainer as DomContainer
    }

    return projectionState.getProjectedNode(parentId) as DomElementNode
  }

  const findReferenceNode = (
    parentNode: DomContainer | DomElementNode,
    parentId: BubbleNodeId,
    index: number
  ): DomChildNode | null => {
    const parent = getBubbleContainerNode(options.bubble, parentId)

    for (const siblingId of parent.children.slice(index + 1)) {
      const siblingNode = projectionState.getProjectedNode(siblingId)

      if (siblingNode !== undefined && siblingNode.parentNode === parentNode)
        return siblingNode
    }

    return null
  }

  const insertChildAt = (
    parentId: BubbleNodeId,
    childId: BubbleNodeId,
    index: number
  ): void => {
    const document = (mountedContainer as DomContainer).ownerDocument
    const parentNode = getParentNode(parentId)
    const childNode = ensureProjectedNode(childId, document)
    const referenceNode = findReferenceNode(parentNode, parentId, index)

    parentNode.insertBefore(childNode, referenceNode)
  }

  const applyMutation = (mutation: BubbleMutation): void => {
    if (mutation.type === 'node-created') {
      return
    }

    switch (mutation.type) {
      case 'child-inserted':
      case 'child-moved':
        insertChildAt(mutation.parentId, mutation.childId, mutation.index)
        return
      case 'child-removed':
        projectionState.getProjectedNode(mutation.childId)?.remove()
        return
      case 'text-set':
        ;(
          ensureProjectedNode(
            mutation.nodeId,
            (mountedContainer as DomContainer).ownerDocument
          ) as DomTextNode
        ).data = mutation.value
        return
      case 'attribute-set':
        ;(
          ensureProjectedNode(
            mutation.nodeId,
            (mountedContainer as DomContainer).ownerDocument
          ) as DomElementNode
        ).setAttribute(mutation.name, mutation.value)
        return
      case 'attribute-removed':
        ;(
          ensureProjectedNode(
            mutation.nodeId,
            (mountedContainer as DomContainer).ownerDocument
          ) as DomElementNode
        ).removeAttribute(mutation.name)
        return
      case 'property-set':
        setDomProperty(
          ensureProjectedNode(
            mutation.nodeId,
            (mountedContainer as DomContainer).ownerDocument
          ) as DomElementNode,
          mutation.name,
          mutation.value
        )
        return
    }
  }

  const handleRuntimeEvent = (event: BubbleRuntimeEvent): void => {
    if (event.type === 'transaction-committed') {
      for (const mutation of event.record.mutations) {
        applyMutation(mutation)
      }

      return
    }

    focusSync?.syncBubbleFocusToDom(event.nodeId)
  }

  const bridgeClickEvent = (event: DomEvent): void => {
    const targetNode = event.target

    if (targetNode === null) {
      return
    }

    const targetId = projectionState.getBubbleNodeId(targetNode)

    if (targetId === undefined) {
      return
    }

    options.bubble.dispatchEvent({ type: 'click', targetId })
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

    options.bubble.dispatchEvent({ type: 'submit', targetId })

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

    const target = getBubbleNode(options.bubble, targetId)

    if (target.kind !== 'element') {
      return
    }

    options.bubble.dispatchEvent({
      type: 'change',
      targetId,
      data: readDomChangeEventData(targetNode, target),
    })
  }

  const projector: BubbleDomProjector = {
    mount(container: HTMLElement) {
      if (mountedContainer !== null) {
        throw new Error('Bubble DOM projector is already mounted.')
      }

      const domContainer = container as unknown as DomContainer
      const snapshot = options.bubble.snapshot()
      const root = snapshot.nodes.get(snapshot.rootId)

      if (root === undefined || root.kind !== 'root') {
        throw new Error(
          `Bubble snapshot is missing root node ${snapshot.rootId}.`
        )
      }

      for (const childId of root.children) {
        domContainer.appendChild(
          ensureProjectedNode(childId, domContainer.ownerDocument)
        )
      }

      mountedContainer = domContainer
      unsubscribe = options.bubble.subscribe(handleRuntimeEvent)

      if (options.bridgeEvents === true) {
        domContainer.addEventListener('click', bridgeClickEvent)
        domContainer.addEventListener('input', bridgeChangeEvent, true)
        domContainer.addEventListener('submit', bridgeSubmitEvent, true)
        removeDomEventBridges = () => {
          domContainer.removeEventListener('click', bridgeClickEvent)
          domContainer.removeEventListener('input', bridgeChangeEvent, true)
          domContainer.removeEventListener('submit', bridgeSubmitEvent, true)
        }
      }

      focusSync?.syncBubbleFocusToDom(options.bubble.getFocusedNodeId())
    },
    unmount() {
      if (mountedContainer === null) {
        return
      }

      removeDomEventBridges?.()
      removeDomEventBridges = null
      unsubscribe?.()
      unsubscribe = null

      for (const childId of options.bubble.getRoot().children) {
        const projectedNode = projectionState.getProjectedNode(childId)

        projectedNode?.remove()
      }

      projectionState.clear()
      mountedContainer = null
    },
  }

  attachDomProjectionState(projector, projectionState)

  return Object.freeze(projector)
}
