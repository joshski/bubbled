import type {
  BubbleLayout,
  BubbleRect,
  BubbleViewportState,
} from '../bubble-capabilities'
import type {
  BubbleElementNode,
  BubbleMutation,
  BubbleNode,
  BubbleNodeId,
  BubbleRootNode,
  BubbleRuntime,
  BubbleRuntimeEvent,
} from '../bubble-core'

export interface BubbleDomProjector {
  mount(container: HTMLElement): void
  unmount(): void
}

export interface PlacementInput {
  anchor: BubbleRect
  overlay: BubbleRect
  viewport: BubbleViewportState
}

export interface PlacementOutput {
  x: number
  y: number
  placement: 'top' | 'bottom'
}

export interface CreateDomProjectorOptions {
  bubble: BubbleRuntime
  bridgeEvents?: boolean
  syncFocus?: boolean
}

interface DomParentNode {
  appendChild(node: DomChildNode): DomChildNode
  insertBefore(
    node: DomChildNode,
    referenceNode: DomChildNode | null
  ): DomChildNode
  removeChild(node: DomChildNode): DomChildNode
}

interface DomChildNode {
  parentNode: DomParentNode | null
  remove(): void
}

interface DomTextNode extends DomChildNode {
  data: string
}

interface DomElementNode extends DomChildNode, DomParentNode {
  addEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  removeEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  focus(): void
  blur(): void
  getBoundingClientRect(): BubbleRect
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

interface DomEvent {
  readonly type: string
  readonly target: DomChildNode | null
  preventDefault(): void
}

interface DomDocument {
  activeElement: DomElementNode | null
  createElement(tag: string): DomElementNode
  createTextNode(value: string): DomTextNode
}

interface DomContainer extends DomParentNode {
  addEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  removeEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  ownerDocument: DomDocument
}

const projectedElementLookupByProjector = new WeakMap<
  BubbleDomProjector,
  Map<BubbleNodeId, DomElementNode>
>()

function isDomElementNode(node: DomChildNode): node is DomElementNode {
  return 'focus' in node
}

export function placePopover(input: PlacementInput): PlacementOutput {
  const fitsBelow =
    input.anchor.y + input.anchor.height + input.overlay.height <=
    input.viewport.height

  if (fitsBelow) {
    return {
      x: input.anchor.x,
      y: input.anchor.y + input.anchor.height,
      placement: 'bottom',
    }
  }

  return {
    x: input.anchor.x,
    y: input.anchor.y - input.overlay.height,
    placement: 'top',
  }
}

export function measureAndPlacePopover(
  bubble: Pick<BubbleRuntime, 'measureElement' | 'getViewportState'>,
  anchorId: BubbleNodeId,
  overlayId: BubbleNodeId
): PlacementOutput {
  return placePopover({
    anchor: bubble.measureElement(anchorId),
    overlay: bubble.measureElement(overlayId),
    viewport: bubble.getViewportState(),
  })
}

export function createDomLayout(options: {
  projector: BubbleDomProjector
}): BubbleLayout {
  return Object.freeze({
    measureElement(nodeId: BubbleNodeId) {
      const projectedElements = projectedElementLookupByProjector.get(
        options.projector
      )

      if (projectedElements === undefined) {
        throw new Error(
          'Bubble DOM projector does not support DOM-backed layout measurement.'
        )
      }

      const element = projectedElements.get(nodeId)

      if (element === undefined) {
        throw new Error(
          `Bubble DOM projector has no projected element for node ${nodeId}.`
        )
      }

      if (element.parentNode === null) {
        throw new Error(
          `Bubble DOM projector cannot measure detached node ${nodeId}.`
        )
      }

      const rect = element.getBoundingClientRect()

      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    },
  })
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
  const nodeLookup = new Map<BubbleNodeId, DomChildNode>()
  const bubbleIdByDomNode = new Map<DomChildNode, BubbleNodeId>()
  const projectedElements = new Map<BubbleNodeId, DomElementNode>()
  let isSyncingFocusFromBubble = false
  let isSyncingFocusFromDom = false

  const syncDomFocus = (nodeId: BubbleNodeId | null): void => {
    const activeElement = (mountedContainer as DomContainer).ownerDocument
      .activeElement

    if (nodeId === null) {
      if (activeElement !== null && bubbleIdByDomNode.has(activeElement)) {
        isSyncingFocusFromBubble = true
        activeElement.blur()
        isSyncingFocusFromBubble = false
      }

      return
    }

    const projectedNode = nodeLookup.get(nodeId)

    if (projectedNode === undefined || !isDomElementNode(projectedNode)) {
      return
    }

    if (activeElement === projectedNode) {
      return
    }

    isSyncingFocusFromBubble = true
    projectedNode.focus()
    isSyncingFocusFromBubble = false
  }

  const ensureProjectedNode = (
    nodeId: BubbleNodeId,
    document: DomDocument
  ): DomChildNode => {
    const existingNode = nodeLookup.get(nodeId)

    if (existingNode !== undefined) {
      return existingNode
    }

    const node = getBubbleNode(options.bubble, nodeId)

    if (node.kind === 'text') {
      const textNode = document.createTextNode(node.value)

      nodeLookup.set(nodeId, textNode)
      bubbleIdByDomNode.set(textNode, nodeId)
      return textNode
    }

    if (node.kind !== 'element') {
      throw new Error(`Cannot project bubble root node ${nodeId} into the DOM.`)
    }

    const element = document.createElement(node.tag)

    nodeLookup.set(nodeId, element)
    bubbleIdByDomNode.set(element, nodeId)
    projectedElements.set(nodeId, element)

    if (options.syncFocus === true) {
      element.addEventListener('focus', event => {
        if (isSyncingFocusFromBubble || isSyncingFocusFromDom) {
          return
        }

        const targetNode = event.target

        if (targetNode === null) {
          return
        }

        const targetId = bubbleIdByDomNode.get(targetNode)

        if (
          targetId === undefined ||
          options.bubble.getFocusedNodeId() === targetId
        ) {
          return
        }

        isSyncingFocusFromDom = true
        options.bubble.focus(targetId)
        isSyncingFocusFromDom = false
      })
    }

    for (const [name, value] of Object.entries(node.attributes)) {
      element.setAttribute(name, value)
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

    return nodeLookup.get(parentId) as DomElementNode
  }

  const findReferenceNode = (
    parentNode: DomContainer | DomElementNode,
    parentId: BubbleNodeId,
    index: number
  ): DomChildNode | null => {
    const parent = getBubbleContainerNode(options.bubble, parentId)

    for (const siblingId of parent.children.slice(index + 1)) {
      const siblingNode = nodeLookup.get(siblingId)

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
    if (mutation.type === 'node-created' || mutation.type === 'property-set') {
      return
    }

    switch (mutation.type) {
      case 'child-inserted':
      case 'child-moved':
        insertChildAt(mutation.parentId, mutation.childId, mutation.index)
        return
      case 'child-removed':
        nodeLookup.get(mutation.childId)?.remove()
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
    }
  }

  const handleRuntimeEvent = (event: BubbleRuntimeEvent): void => {
    if (event.type === 'transaction-committed') {
      for (const mutation of event.record.mutations) {
        applyMutation(mutation)
      }

      return
    }

    if (options.syncFocus === true) {
      syncDomFocus(event.nodeId)
    }
  }

  const bridgeClickEvent = (event: DomEvent): void => {
    const targetNode = event.target

    if (targetNode === null) {
      return
    }

    const targetId = bubbleIdByDomNode.get(targetNode)

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

    const targetId = bubbleIdByDomNode.get(targetNode)

    if (targetId === undefined) {
      return
    }

    options.bubble.dispatchEvent({ type: 'submit', targetId })

    // Native form navigation is outside the bubble runtime; keep the browser
    // on the current document after translating the submit into bubble events.
    event.preventDefault()
  }

  const projector = Object.freeze({
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
        domContainer.addEventListener('submit', bridgeSubmitEvent, true)
        removeDomEventBridges = () => {
          domContainer.removeEventListener('click', bridgeClickEvent)
          domContainer.removeEventListener('submit', bridgeSubmitEvent, true)
        }
      }

      if (options.syncFocus === true) {
        syncDomFocus(options.bubble.getFocusedNodeId())
      }
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
        const projectedNode = nodeLookup.get(childId)

        projectedNode?.remove()
        if (projectedNode !== undefined) {
          bubbleIdByDomNode.delete(projectedNode)
        }
      }

      nodeLookup.clear()
      bubbleIdByDomNode.clear()
      projectedElements.clear()
      mountedContainer = null
    },
  })

  projectedElementLookupByProjector.set(projector, projectedElements)

  return projector
}
