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
  readonly target: {
    readonly id: BubbleNodeId
    readonly value: string
    readonly checked: boolean | null
  }
  readonly currentTargetId: BubbleNodeId
  readonly currentTarget: {
    readonly id: BubbleNodeId
    readonly value: string
    readonly checked: boolean | null
  }
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
