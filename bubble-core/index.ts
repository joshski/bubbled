import type {
  BubbleCapabilities,
  BubbleCapabilityName,
  BubbleNetworkRequest,
  BubbleNetworkResponse,
  BubbleRect,
  BubbleTimerHandle,
  BubbleViewportListener,
  BubbleViewportState,
} from '../bubble-capabilities'

import { createBubbleCapabilityRuntime } from './capabilities'
import {
  deriveElementName,
  deriveElementRole,
  isCheckboxInputElement,
  resolveLabelControl,
} from './dom-semantics'
import { createBubbleEventRuntime } from './event-runtime'
import { createBubbleFocusNavigation } from './focus-navigation'
import { createBubbleRuntimeStore } from './runtime-store'

export type BubbleNodeId = string

export type BubbleNamespace = 'html' | 'svg'

export interface BubbleRootNode {
  id: BubbleNodeId
  kind: 'root'
  children: BubbleNodeId[]
}

export interface BubbleElementNode {
  id: BubbleNodeId
  kind: 'element'
  tag: string
  namespace: BubbleNamespace
  parentId: BubbleNodeId | null
  children: BubbleNodeId[]
  attributes: Record<string, string>
  properties: Record<string, unknown>
  value: string | null
  checked: boolean | null
  role: string | null
  name: string | null
}

export interface BubbleTextNode {
  id: BubbleNodeId
  kind: 'text'
  parentId: BubbleNodeId | null
  value: string
}

export type BubbleNode = BubbleRootNode | BubbleElementNode | BubbleTextNode

export type BubbleMutation =
  | { type: 'node-created'; nodeId: BubbleNodeId; kind: 'element' | 'text' }
  | {
      type: 'child-inserted'
      parentId: BubbleNodeId
      childId: BubbleNodeId
      index: number
    }
  | {
      type: 'child-removed'
      parentId: BubbleNodeId
      childId: BubbleNodeId
      index: number
    }
  | {
      type: 'child-moved'
      parentId: BubbleNodeId
      childId: BubbleNodeId
      index: number
    }
  | { type: 'attribute-set'; nodeId: BubbleNodeId; name: string; value: string }
  | { type: 'attribute-removed'; nodeId: BubbleNodeId; name: string }
  | { type: 'property-set'; nodeId: BubbleNodeId; name: string; value: unknown }
  | { type: 'text-set'; nodeId: BubbleNodeId; value: string }

export interface BubbleTransaction {
  createElement(input: {
    tag: string
    namespace?: BubbleNamespace
  }): BubbleNodeId
  createText(input: { value: string }): BubbleNodeId
  setText(input: { nodeId: BubbleNodeId; value: string }): void
  insertChild(input: {
    parentId: BubbleNodeId
    childId: BubbleNodeId
    index?: number
  }): void
  removeChild(input: { parentId: BubbleNodeId; childId: BubbleNodeId }): void
  moveChild(input: {
    parentId: BubbleNodeId
    childId: BubbleNodeId
    index: number
  }): void
  setAttribute(input: {
    nodeId: BubbleNodeId
    name: string
    value: string
  }): void
  removeAttribute(input: { nodeId: BubbleNodeId; name: string }): void
  setProperty(input: {
    nodeId: BubbleNodeId
    name: string
    value: unknown
  }): void
  addEventListener(input: {
    nodeId: BubbleNodeId
    type: string
    listener: BubbleEventListener
    capture?: boolean
  }): BubbleListenerHandle
  removeEventListener(handle: BubbleListenerHandle): void
}

export interface BubbleTransactionRecord {
  sequence: number
  mutations: readonly BubbleMutation[]
}

export type BubbleRuntimeEvent =
  | {
      type: 'transaction-committed'
      record: BubbleTransactionRecord
    }
  | {
      type: 'focus-changed'
      nodeId: BubbleNodeId | null
    }

export type BubbleRuntimeListener = (event: BubbleRuntimeEvent) => void

export interface BubbleDispatchInput {
  type: string
  targetId: BubbleNodeId
  data?: Record<string, unknown>
  cancelable?: boolean
}

export interface BubbleSubmitDispatchInput extends BubbleDispatchInput {
  type: 'submit'
}

export interface BubbleEvent {
  readonly type: string
  readonly targetId: BubbleNodeId
  readonly currentTargetId: BubbleNodeId
  readonly phase: 'capture' | 'target' | 'bubble'
  readonly cancelable: boolean
  readonly defaultPrevented: boolean
  readonly data: Readonly<Record<string, unknown>>
  preventDefault(): void
  stopPropagation(): void
}

export type BubbleEventListener = (event: BubbleEvent) => void

export interface BubbleDispatchResult {
  readonly defaultPrevented: boolean
  readonly delivered: boolean
}

export interface BubbleSubmitDispatchResult extends BubbleDispatchResult {
  readonly payload: BubbleFormPayload | null
}

export interface BubbleFormEntry {
  readonly name: string
  readonly value: string
}

export type BubbleFormPayload = readonly BubbleFormEntry[]

export interface BubbleListenerHandle {
  readonly nodeId: BubbleNodeId
  readonly type: string
  readonly capture: boolean
  readonly internalId: string
}

export interface BubbleSnapshot {
  readonly rootId: BubbleNodeId
  readonly nodes: ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>
  readonly query: BubbleQueryApi
}

export type BubbleSerializedProperty =
  | null
  | boolean
  | number
  | string
  | readonly BubbleSerializedProperty[]
  | { readonly [key: string]: BubbleSerializedProperty }

export interface BubbleSerializedRootNode {
  readonly kind: 'root'
  readonly children: readonly BubbleSerializedNode[]
}

export interface BubbleSerializedElementNode {
  readonly kind: 'element'
  readonly tag: string
  readonly namespace: BubbleNamespace
  readonly attributes: Readonly<Record<string, string>>
  readonly properties: Readonly<Record<string, BubbleSerializedProperty>>
  readonly children: readonly BubbleSerializedNode[]
}

export interface BubbleSerializedTextNode {
  readonly kind: 'text'
  readonly value: string
}

export type BubbleSerializedNode =
  | BubbleSerializedRootNode
  | BubbleSerializedElementNode
  | BubbleSerializedTextNode

export interface BubbleQueryApi {
  getById(id: BubbleNodeId): Readonly<BubbleNode> | null
  getByTag(tag: string): ReadonlyArray<Readonly<BubbleElementNode>>
  getByRole(
    role: string,
    options?: { name?: string }
  ): ReadonlyArray<Readonly<BubbleElementNode>>
  getControlForLabel(labelId: BubbleNodeId): Readonly<BubbleElementNode> | null
}

export interface BubbleRuntime {
  readonly rootId: BubbleNodeId
  resolveCapability<Name extends BubbleCapabilityName>(
    name: Name
  ): BubbleCapabilities[Name]
  now(): number
  setTimeout(callback: () => void, delayMs: number): BubbleTimerHandle
  clearTimeout(handle: BubbleTimerHandle): void
  queueMicrotask(task: () => void): void
  measureElement(nodeId: BubbleNodeId): BubbleRect
  getViewportState(): BubbleViewportState
  subscribeToViewport(listener: BubbleViewportListener): () => void
  fetch(request: BubbleNetworkRequest): Promise<BubbleNetworkResponse>
  transact<T>(fn: (tx: BubbleTransaction) => T): T
  getNode(id: BubbleNodeId): Readonly<BubbleNode> | null
  getRoot(): Readonly<BubbleRootNode>
  snapshot(): BubbleSnapshot
  serializeForm(formId: BubbleNodeId): BubbleFormPayload
  dispatchEvent(input: BubbleSubmitDispatchInput): BubbleSubmitDispatchResult
  dispatchEvent(input: BubbleDispatchInput): BubbleDispatchResult
  focus(id: BubbleNodeId): void
  blur(): void
  getFocusedNodeId(): BubbleNodeId | null
  getTabOrder(): readonly BubbleNodeId[]
  subscribe(listener: BubbleRuntimeListener): () => void
}

export interface CreateBubbleOptions {
  capabilities?: Partial<BubbleCapabilities>
}

export function createBubbleQuery(
  snapshot: Pick<BubbleSnapshot, 'nodes'>
): BubbleQueryApi {
  return Object.freeze({
    getById(id: BubbleNodeId): Readonly<BubbleNode> | null {
      return snapshot.nodes.get(id) ?? null
    },
    getByTag(tag: string): ReadonlyArray<Readonly<BubbleElementNode>> {
      const matchingNodes: Readonly<BubbleElementNode>[] = []

      for (const node of snapshot.nodes.values()) {
        if (node.kind === 'element' && node.tag === tag) {
          matchingNodes.push(node)
        }
      }

      return Object.freeze(matchingNodes)
    },
    getByRole(
      role: string,
      options?: { name?: string }
    ): ReadonlyArray<Readonly<BubbleElementNode>> {
      const matchingNodes: Readonly<BubbleElementNode>[] = []

      for (const node of snapshot.nodes.values()) {
        if (node.kind !== 'element' || node.role !== role) {
          continue
        }

        if (options?.name !== undefined && node.name !== options.name) {
          continue
        }

        matchingNodes.push(node)
      }

      return Object.freeze(matchingNodes)
    },
    getControlForLabel(
      labelId: BubbleNodeId
    ): Readonly<BubbleElementNode> | null {
      return resolveLabelControl(labelId, snapshot.nodes)
    },
  })
}

function compareKeys(left: string, right: string): number {
  return Number(left > right) - Number(left < right)
}

function serializeBubblePropertyValue(
  value: unknown
): BubbleSerializedProperty {
  if (value === null) {
    return null
  }

  if (
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map(item => serializeBubblePropertyValue(item)))
  }

  if (typeof value === 'object') {
    const serializedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => compareKeys(leftKey, rightKey))
      .map(
        ([key, nestedValue]) =>
          [key, serializeBubblePropertyValue(nestedValue)] as const
      )

    return Object.freeze(Object.fromEntries(serializedEntries))
  }

  throw new Error(
    `Unsupported property value in snapshot serialization: ${String(value)}`
  )
}

function serializeBubbleAttributes(
  attributes: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(attributes).sort(([leftKey], [rightKey]) =>
        compareKeys(leftKey, rightKey)
      )
    )
  )
}

function projectSerializedNode(
  nodeId: BubbleNodeId,
  nodes: ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>
): BubbleSerializedNode {
  const node = nodes.get(nodeId)

  if (node === undefined) {
    throw new Error(`Cannot serialize missing node: ${nodeId}`)
  }

  if (node.kind === 'root') {
    return Object.freeze({
      kind: 'root',
      children: Object.freeze(
        node.children.map(childId => projectSerializedNode(childId, nodes))
      ),
    })
  }

  if (node.kind === 'text') {
    return Object.freeze({
      kind: 'text',
      value: node.value,
    })
  }

  return Object.freeze({
    kind: 'element',
    tag: node.tag,
    namespace: node.namespace,
    attributes: serializeBubbleAttributes(node.attributes),
    properties: Object.freeze(
      Object.fromEntries(
        Object.entries(node.properties)
          .sort(([leftKey], [rightKey]) => compareKeys(leftKey, rightKey))
          .map(
            ([key, value]) =>
              [key, serializeBubblePropertyValue(value)] as const
          )
      )
    ),
    children: Object.freeze(
      node.children.map(childId => projectSerializedNode(childId, nodes))
    ),
  })
}

export function serializeBubbleSnapshot(snapshot: BubbleSnapshot): string {
  return JSON.stringify(
    projectSerializedNode(snapshot.rootId, snapshot.nodes),
    null,
    2
  )
}

export function createBubble(options: CreateBubbleOptions = {}): BubbleRuntime {
  const capabilities = createBubbleCapabilityRuntime(options.capabilities)
  const listeners = new Set<BubbleRuntimeListener>()

  const emitRuntimeEvent = (event: BubbleRuntimeEvent): void => {
    for (const listener of listeners) {
      listener(event)
    }
  }

  const runtimeStore = createBubbleRuntimeStore({
    createQuery: createBubbleQuery,
    createTransactionParticipant(input) {
      return eventRuntime.createTransactionParticipant(input)
    },
    refreshDerivedElementMetadata(
      nodeLookup: Map<BubbleNodeId, BubbleNode>
    ): void {
      for (const node of nodeLookup.values()) {
        if (node.kind !== 'element') {
          continue
        }

        node.checked =
          isCheckboxInputElement(node) &&
          typeof node.properties.checked === 'boolean'
            ? node.properties.checked
            : isCheckboxInputElement(node)
              ? false
              : null
        node.role = deriveElementRole(node)
        node.name = deriveElementName(node, nodeLookup)
      }
    },
    onTransactionCommitted(record) {
      emitRuntimeEvent({
        type: 'transaction-committed',
        record,
      })
    },
  })

  const getNodes = (): ReadonlyMap<BubbleNodeId, BubbleNode> =>
    runtimeStore.getNodes()
  const eventRuntime = createBubbleEventRuntime({
    getNodes,
  })
  const focusNavigation = createBubbleFocusNavigation({
    rootId: runtimeStore.rootId,
    getNodes,
    dispatchEvent(input) {
      return eventRuntime.dispatchEvent(input) as BubbleDispatchResult
    },
    emitRuntimeEvent,
  })

  function dispatchEvent(
    input: BubbleSubmitDispatchInput
  ): BubbleSubmitDispatchResult
  function dispatchEvent(input: BubbleDispatchInput): BubbleDispatchResult
  function dispatchEvent({
    type,
    targetId,
    data = {},
    cancelable = type === 'submit',
  }: BubbleDispatchInput): BubbleDispatchResult | BubbleSubmitDispatchResult {
    return eventRuntime.dispatchEvent({ type, targetId, data, cancelable })
  }

  return {
    rootId: runtimeStore.rootId,
    resolveCapability(name) {
      return capabilities.resolveCapability(name)
    },
    now() {
      return capabilities.now()
    },
    setTimeout(callback, delayMs) {
      return capabilities.setTimeout(callback, delayMs)
    },
    clearTimeout(handle) {
      capabilities.clearTimeout(handle)
    },
    queueMicrotask(task) {
      capabilities.queueMicrotask(task)
    },
    measureElement(nodeId) {
      return capabilities.measureElement(nodeId)
    },
    getViewportState() {
      return capabilities.getViewportState()
    },
    subscribeToViewport(listener) {
      return capabilities.subscribeToViewport(listener)
    },
    async fetch(request) {
      return capabilities.fetch(request)
    },
    transact<T>(fn: (tx: BubbleTransaction) => T): T {
      return runtimeStore.transact(fn)
    },
    getNode(id) {
      return runtimeStore.getNode(id)
    },
    getRoot() {
      return runtimeStore.getRoot()
    },
    snapshot() {
      return runtimeStore.snapshot()
    },
    serializeForm(formId) {
      return eventRuntime.serializeForm(formId)
    },
    dispatchEvent,
    focus(id) {
      focusNavigation.focus(id)
    },
    blur() {
      focusNavigation.blur()
    },
    getFocusedNodeId() {
      return focusNavigation.getFocusedNodeId()
    },
    getTabOrder() {
      return focusNavigation.getTabOrder()
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
