import type {
  BubbleElementNode,
  BubbleListenerHandle,
  BubbleMutation,
  BubbleNode,
  BubbleNodeId,
  BubbleQueryApi,
  BubbleRootNode,
  BubbleSnapshot,
  BubbleTextNode,
  BubbleTransaction,
  BubbleTransactionRecord,
  BubbleEventListener,
} from './index'

export interface BubbleRegisteredListener {
  handle: BubbleListenerHandle
  listener: BubbleEventListener
}

type BubbleEventListenerMap = Map<
  BubbleNodeId,
  Map<string, BubbleRegisteredListener[]>
>

interface BubbleRuntimeStoreOptions {
  createQuery(snapshot: Pick<BubbleSnapshot, 'nodes'>): BubbleQueryApi
  refreshDerivedElementMetadata(nodeLookup: Map<BubbleNodeId, BubbleNode>): void
  onTransactionCommitted?(record: BubbleTransactionRecord): void
}

export interface BubbleRuntimeStore {
  readonly rootId: BubbleNodeId
  transact<T>(fn: (tx: BubbleTransaction) => T): T
  getNode(id: BubbleNodeId): Readonly<BubbleNode> | null
  getRoot(): Readonly<BubbleRootNode>
  snapshot(): BubbleSnapshot
  getNodes(): ReadonlyMap<BubbleNodeId, BubbleNode>
  getEventListeners(): BubbleEventListenerMap
}

const ROOT_NODE_ID = 'root'
const NODE_ID_PREFIX = 'node:'
const ELEMENT_TAG_ERROR = 'Element tag must be a non-empty string'
const TEXT_VALUE_ERROR = 'Text value must be a string'
const EVENT_TYPE_ERROR = 'Event type must be a non-empty string'
const CHILD_INDEX_ERROR =
  'Child index must be an integer within the parent child range'
const NESTED_TRANSACTION_ERROR = 'Nested transactions are not supported'

let nextBubbleInstanceId = 0

function assertValidElementTag(tag: unknown): asserts tag is string {
  if (typeof tag !== 'string' || tag.trim().length === 0) {
    throw new Error(ELEMENT_TAG_ERROR)
  }
}

function assertValidTextValue(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(TEXT_VALUE_ERROR)
  }
}

function assertValidCheckedValue(value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error('Checked value must be a boolean')
  }
}

function assertValidEventType(type: unknown): asserts type is string {
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw new Error(EVENT_TYPE_ERROR)
  }
}

function assertValidChildIndex(
  index: unknown,
  childCount: number
): asserts index is number {
  if (
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index > childCount
  ) {
    throw new Error(CHILD_INDEX_ERROR)
  }
}

function assertElementNode(
  node: BubbleNode,
  nodeId: BubbleNodeId,
  target: 'Attributes' | 'Properties'
): asserts node is BubbleElementNode {
  if (node.kind !== 'element') {
    throw new Error(`${target} are only supported on element nodes: ${nodeId}`)
  }
}

function getStringProperty(
  node: BubbleElementNode,
  name: string
): string | null {
  const propertyValue = node.properties[name]

  return typeof propertyValue === 'string' ? propertyValue : null
}

function getInputType(node: BubbleElementNode): string | null {
  if (node.namespace !== 'html' || node.tag !== 'input') {
    return null
  }

  return (
    node.attributes.type ??
    getStringProperty(node, 'type') ??
    'text'
  ).toLowerCase()
}

function isTextInputElement(
  node: BubbleElementNode
): node is BubbleElementNode & { value: string } {
  return getInputType(node) === 'text'
}

function isCheckboxInputElement(node: BubbleElementNode): boolean {
  return getInputType(node) === 'checkbox'
}

function assertValuePropertyTarget(
  node: BubbleElementNode,
  nodeId: BubbleNodeId
): asserts node is BubbleElementNode & { value: string } {
  if (!isTextInputElement(node)) {
    throw new Error(
      `The value property is only supported on text input elements: ${nodeId}`
    )
  }
}

function assertCheckedPropertyTarget(
  node: BubbleElementNode,
  nodeId: BubbleNodeId
): asserts node is BubbleElementNode & { checked: boolean } {
  if (!isCheckboxInputElement(node)) {
    throw new Error(
      `The checked property is only supported on checkbox input elements: ${nodeId}`
    )
  }
}

function assertTextNode(
  node: BubbleNode,
  nodeId: BubbleNodeId
): asserts node is BubbleTextNode {
  if (node.kind !== 'text') {
    throw new Error(`Text content can only be updated on text nodes: ${nodeId}`)
  }
}

function assertEventTargetNode(
  node: BubbleNode,
  nodeId: BubbleNodeId
): asserts node is BubbleElementNode {
  if (node.kind !== 'element') {
    throw new Error(
      `Event listeners are only supported on element nodes: ${nodeId}`
    )
  }
}

function cloneNode(node: BubbleNode): BubbleNode {
  if (node.kind === 'root') {
    return {
      id: node.id,
      kind: node.kind,
      children: [...node.children],
    }
  }

  if (node.kind === 'element') {
    return {
      id: node.id,
      kind: node.kind,
      tag: node.tag,
      namespace: node.namespace,
      parentId: node.parentId,
      children: [...node.children],
      attributes: { ...node.attributes },
      properties: { ...node.properties },
      value: node.value,
      checked: node.checked,
      role: node.role,
      name: node.name,
    }
  }

  return {
    id: node.id,
    kind: node.kind,
    parentId: node.parentId,
    value: node.value,
  }
}

function snapshotNode(node: BubbleNode): Readonly<BubbleNode> {
  if (node.kind === 'root') {
    return Object.freeze({
      id: node.id,
      kind: node.kind,
      children: Object.freeze([...node.children]),
    }) as Readonly<BubbleRootNode>
  }

  if (node.kind === 'element') {
    const elementSnapshot = {
      id: node.id,
      kind: node.kind,
      tag: node.tag,
      namespace: node.namespace,
      parentId: node.parentId,
      children: Object.freeze([...node.children]),
      attributes: Object.freeze({ ...node.attributes }),
      properties: Object.freeze({ ...node.properties }),
    }

    Object.defineProperty(elementSnapshot, 'role', {
      value: node.role,
      enumerable: false,
      writable: false,
      configurable: false,
    })

    Object.defineProperty(elementSnapshot, 'name', {
      value: node.name,
      enumerable: false,
      writable: false,
      configurable: false,
    })

    Object.defineProperty(elementSnapshot, 'value', {
      value: node.value,
      enumerable: false,
      writable: false,
      configurable: false,
    })

    Object.defineProperty(elementSnapshot, 'checked', {
      value: node.checked,
      enumerable: false,
      writable: false,
      configurable: false,
    })

    return Object.freeze(elementSnapshot) as Readonly<BubbleNode>
  }

  return Object.freeze({
    id: node.id,
    kind: node.kind,
    parentId: node.parentId,
    value: node.value,
  })
}

function cloneEventListeners(
  source: BubbleEventListenerMap
): BubbleEventListenerMap {
  const clonedListeners = new Map<
    BubbleNodeId,
    Map<string, BubbleRegisteredListener[]>
  >()

  for (const [nodeId, nodeListeners] of source) {
    const clonedNodeListeners = new Map<string, BubbleRegisteredListener[]>()

    for (const [eventType, registrations] of nodeListeners) {
      clonedNodeListeners.set(
        eventType,
        registrations.map(registration => ({ ...registration }))
      )
    }

    clonedListeners.set(nodeId, clonedNodeListeners)
  }

  return clonedListeners
}

function insertIntoParent(
  parent: BubbleRootNode | BubbleElementNode,
  childId: BubbleNodeId,
  index: number
): void {
  assertValidChildIndex(index, parent.children.length)
  parent.children.splice(index, 0, childId)
}

function removeFromParent(
  parent: BubbleRootNode | BubbleElementNode,
  childId: BubbleNodeId
): number {
  const childIndex = parent.children.indexOf(childId)

  if (childIndex === -1) {
    throw new Error(`Node ${childId} is not a child of ${parent.id}`)
  }

  parent.children.splice(childIndex, 1)

  return childIndex
}

function moveWithinParent(
  parent: BubbleRootNode | BubbleElementNode,
  childId: BubbleNodeId,
  index: number
): void {
  const childIndex = parent.children.indexOf(childId)

  if (childIndex === -1) {
    throw new Error(`Node ${childId} is not a child of ${parent.id}`)
  }

  assertValidChildIndex(index, parent.children.length - 1)

  parent.children.splice(childIndex, 1)
  parent.children.splice(index, 0, childId)
}

function getNodeListeners(
  listenerMap: BubbleEventListenerMap,
  nodeId: BubbleNodeId
): Map<string, BubbleRegisteredListener[]> {
  const nodeListeners = listenerMap.get(nodeId)

  if (nodeListeners !== undefined) {
    return nodeListeners
  }

  const createdNodeListeners = new Map<string, BubbleRegisteredListener[]>()
  listenerMap.set(nodeId, createdNodeListeners)

  return createdNodeListeners
}

export function createBubbleRuntimeStore({
  createQuery,
  refreshDerivedElementMetadata,
  onTransactionCommitted,
}: BubbleRuntimeStoreOptions): BubbleRuntimeStore {
  const root: BubbleRootNode = {
    id: ROOT_NODE_ID,
    kind: 'root',
    children: [],
  }

  let nodes = new Map<BubbleNodeId, BubbleNode>([[root.id, root]])
  let eventListeners: BubbleEventListenerMap = new Map()
  nextBubbleInstanceId += 1
  const bubbleInstanceId = nextBubbleInstanceId
  let nextNodeId = 0
  let nextTransactionSequence = 0
  let nextListenerId = 0
  let transactionDepth = 0

  const allocateNodeId = (): BubbleNodeId => {
    nextNodeId += 1

    return `${NODE_ID_PREFIX}${bubbleInstanceId}:${nextNodeId}`
  }

  const allocateListenerId = (): string => {
    nextListenerId += 1

    return `listener:${bubbleInstanceId}:${nextListenerId}`
  }

  const createSnapshot = (): BubbleSnapshot => {
    const snapshotNodes = new Map<BubbleNodeId, Readonly<BubbleNode>>()

    for (const [nodeId, node] of nodes) {
      snapshotNodes.set(nodeId, snapshotNode(node))
    }

    const snapshotBase = {
      rootId: root.id,
      nodes: snapshotNodes as ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>,
    }

    return Object.freeze({
      ...snapshotBase,
      query: createQuery(snapshotBase),
    })
  }

  return {
    rootId: root.id,
    transact<T>(fn: (tx: BubbleTransaction) => T): T {
      if (transactionDepth > 0) {
        throw new Error(NESTED_TRANSACTION_ERROR)
      }

      transactionDepth += 1
      const draftNodes = new Map<BubbleNodeId, BubbleNode>()
      const draftEventListeners = cloneEventListeners(eventListeners)

      for (const [nodeId, node] of nodes) {
        draftNodes.set(nodeId, cloneNode(node))
      }

      const getDraftNode = (id: BubbleNodeId): BubbleNode => {
        const node = draftNodes.get(id)

        if (node === undefined) {
          throw new Error(`Unknown node ID: ${id}`)
        }

        return node
      }

      const mutations: BubbleMutation[] = []

      const transaction: BubbleTransaction = {
        createElement({ tag, namespace = 'html' }) {
          assertValidElementTag(tag)

          const id = allocateNodeId()
          const elementNode: BubbleElementNode = {
            id,
            kind: 'element',
            tag,
            namespace,
            parentId: null,
            children: [],
            attributes: {},
            properties: {},
            value: tag === 'input' && namespace === 'html' ? '' : null,
            checked: null,
            role: null,
            name: null,
          }

          draftNodes.set(id, elementNode)
          mutations.push({ type: 'node-created', nodeId: id, kind: 'element' })

          return id
        },
        createText({ value }) {
          assertValidTextValue(value)

          const id = allocateNodeId()

          draftNodes.set(id, {
            id,
            kind: 'text',
            parentId: null,
            value,
          })
          mutations.push({ type: 'node-created', nodeId: id, kind: 'text' })

          return id
        },
        setText({ nodeId, value }) {
          const node = getDraftNode(nodeId)

          assertValidTextValue(value)
          assertTextNode(node, nodeId)
          node.value = value
          mutations.push({ type: 'text-set', nodeId, value })
        },
        insertChild({ parentId, childId, index }) {
          const parent = getDraftNode(parentId)
          const child = getDraftNode(childId)

          if (parent.kind === 'text') {
            throw new Error(`Text nodes cannot have children: ${parentId}`)
          }

          if (child.kind === 'root') {
            throw new Error('The root node cannot be inserted as a child')
          }

          child.parentId = parentId
          const insertionIndex = index ?? parent.children.length

          insertIntoParent(parent, childId, insertionIndex)
          mutations.push({
            type: 'child-inserted',
            parentId,
            childId,
            index: insertionIndex,
          })
        },
        removeChild({ parentId, childId }) {
          const parent = getDraftNode(parentId)
          const child = getDraftNode(childId)

          if (parent.kind === 'text') {
            throw new Error(`Text nodes cannot have children: ${parentId}`)
          }

          if (child.kind === 'root') {
            throw new Error('The root node cannot be removed as a child')
          }

          const removedIndex = removeFromParent(parent, childId)
          child.parentId = null
          mutations.push({
            type: 'child-removed',
            parentId,
            childId,
            index: removedIndex,
          })
        },
        moveChild({ parentId, childId, index }) {
          const parent = getDraftNode(parentId)
          const child = getDraftNode(childId)

          if (parent.kind === 'text') {
            throw new Error(`Text nodes cannot have children: ${parentId}`)
          }

          if (child.kind === 'root') {
            throw new Error('The root node cannot be moved as a child')
          }

          if (child.parentId !== parentId) {
            throw new Error(`Node ${childId} is not a child of ${parentId}`)
          }

          moveWithinParent(parent, childId, index)
          mutations.push({ type: 'child-moved', parentId, childId, index })
        },
        setAttribute({ nodeId, name, value }) {
          const node = getDraftNode(nodeId)

          assertElementNode(node, nodeId, 'Attributes')
          node.attributes[name] = value
          mutations.push({ type: 'attribute-set', nodeId, name, value })
        },
        removeAttribute({ nodeId, name }) {
          const node = getDraftNode(nodeId)

          assertElementNode(node, nodeId, 'Attributes')
          delete node.attributes[name]
          mutations.push({ type: 'attribute-removed', nodeId, name })
        },
        setProperty({ nodeId, name, value }) {
          const node = getDraftNode(nodeId)

          assertElementNode(node, nodeId, 'Properties')
          if (name === 'value') {
            assertValuePropertyTarget(node, nodeId)
            assertValidTextValue(value)
            node.value = value
          }
          if (name === 'checked') {
            assertCheckedPropertyTarget(node, nodeId)
            assertValidCheckedValue(value)
            node.checked = value
          }
          node.properties[name] = value
          mutations.push({ type: 'property-set', nodeId, name, value })
        },
        addEventListener({ nodeId, type, listener, capture = false }) {
          const node = getDraftNode(nodeId)

          assertEventTargetNode(node, nodeId)
          assertValidEventType(type)

          const handle: BubbleListenerHandle = {
            nodeId,
            type,
            capture,
            internalId: allocateListenerId(),
          }
          const nodeListeners = getNodeListeners(draftEventListeners, nodeId)
          const registrations = nodeListeners.get(type) ?? []

          registrations.push({ handle, listener })
          nodeListeners.set(type, registrations)

          return handle
        },
        removeEventListener(handle) {
          const nodeListeners = draftEventListeners.get(handle.nodeId)
          const registrations = nodeListeners?.get(handle.type)

          if (nodeListeners === undefined || registrations === undefined) {
            return
          }

          const nextRegistrations = registrations.filter(
            registration => registration.handle.internalId !== handle.internalId
          )

          if (nextRegistrations.length === registrations.length) {
            return
          }

          if (nextRegistrations.length === 0) {
            nodeListeners.delete(handle.type)

            if (nodeListeners.size === 0) {
              draftEventListeners.delete(handle.nodeId)
            }

            return
          }

          nodeListeners.set(handle.type, nextRegistrations)
        },
      }

      try {
        const result = fn(transaction)
        refreshDerivedElementMetadata(draftNodes)

        nodes = draftNodes
        eventListeners = draftEventListeners
        transactionDepth = 0
        nextTransactionSequence += 1
        onTransactionCommitted?.({
          sequence: nextTransactionSequence,
          mutations,
        })

        return result
      } catch (error) {
        transactionDepth = 0
        throw error
      }
    },
    getNode(id) {
      const node = nodes.get(id)

      return node === undefined ? null : snapshotNode(node)
    },
    getRoot() {
      return snapshotNode(
        nodes.get(root.id) as BubbleRootNode
      ) as Readonly<BubbleRootNode>
    },
    snapshot() {
      return createSnapshot()
    },
    getNodes() {
      return nodes
    },
    getEventListeners() {
      return eventListeners
    },
  }
}
