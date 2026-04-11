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
  createBubbleRuntimeStore,
  type BubbleRegisteredListener,
} from './runtime-store'

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

type BubbleEventPhase = BubbleEvent['phase']
type BubbleEventDispatchMode = 'propagating' | 'target-only'

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

const EVENT_TYPE_ERROR = 'Event type must be a non-empty string'
const FOCUSABLE_HTML_TAGS = new Set(['button', 'input', 'select', 'textarea'])

function assertValidEventType(type: unknown): asserts type is string {
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw new Error(EVENT_TYPE_ERROR)
  }
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

function assertFormNode(
  node: BubbleNode,
  nodeId: BubbleNodeId
): asserts node is BubbleElementNode {
  if (
    node.kind !== 'element' ||
    node.namespace !== 'html' ||
    node.tag !== 'form'
  ) {
    throw new Error(`Only html form elements can be serialized: ${nodeId}`)
  }
}

function assertSubmitTargetNode(
  node: BubbleNode,
  nodeId: BubbleNodeId
): asserts node is BubbleElementNode {
  if (
    node.kind !== 'element' ||
    node.namespace !== 'html' ||
    node.tag !== 'form'
  ) {
    throw new Error(
      `Only html form elements can receive submit events: ${nodeId}`
    )
  }
}

function getTabIndexValue(node: BubbleElementNode): number | null {
  const propertyValue = node.properties.tabIndex

  if (typeof propertyValue === 'number' && Number.isInteger(propertyValue)) {
    return propertyValue
  }

  const attributeValue = node.attributes.tabindex

  if (attributeValue === undefined) {
    return null
  }

  const parsedValue = Number.parseInt(attributeValue, 10)

  return Number.isNaN(parsedValue) ? null : parsedValue
}

function isDisabledElement(node: BubbleElementNode): boolean {
  return (
    node.attributes.disabled !== undefined || node.properties.disabled === true
  )
}

function isTabbableElement(node: BubbleElementNode): boolean {
  if (
    node.namespace !== 'html' ||
    !FOCUSABLE_HTML_TAGS.has(node.tag) ||
    isDisabledElement(node)
  ) {
    return false
  }

  const tabIndex = getTabIndexValue(node)

  return tabIndex === null || tabIndex >= 0
}

function getStringProperty(
  node: BubbleElementNode,
  name: string
): string | null {
  const propertyValue = node.properties[name]

  return typeof propertyValue === 'string' ? propertyValue : null
}

function getFormControlName(node: BubbleElementNode): string | null {
  return node.attributes.name ?? getStringProperty(node, 'name')
}

function getCheckboxSubmissionValue(node: BubbleElementNode): string {
  return node.attributes.value ?? 'on'
}

function getFormEntriesForControl(node: BubbleElementNode): BubbleFormEntry[] {
  if (node.namespace !== 'html' || isDisabledElement(node)) {
    return []
  }

  const name = getFormControlName(node)

  if (name === null) {
    return []
  }

  if (isTextInputElement(node)) {
    return [{ name, value: node.value }]
  }

  if (isCheckboxInputElement(node) && node.checked === true) {
    return [{ name, value: getCheckboxSubmissionValue(node) }]
  }

  return []
}

function getExplicitRole(node: BubbleElementNode): string | null {
  const role = node.attributes.role?.trim()

  return role ? role : null
}

function deriveImplicitRole(node: BubbleElementNode): string | null {
  if (node.namespace !== 'html') {
    return null
  }

  switch (node.tag.toLowerCase()) {
    case 'button':
      return 'button'
    case 'a':
      return node.attributes.href !== undefined ||
        getStringProperty(node, 'href') !== null
        ? 'link'
        : null
    case 'textarea':
      return 'textbox'
    case 'input': {
      return isTextInputElement(node) ? 'textbox' : null
    }
    default:
      return null
  }
}

function deriveElementRole(node: BubbleElementNode): string | null {
  return getExplicitRole(node) ?? deriveImplicitRole(node)
}

function normalizeAccessibleText(value: string): string | null {
  const normalizedValue = value.replace(/\s+/g, ' ').trim()

  return normalizedValue.length === 0 ? null : normalizedValue
}

function deriveTextContent(
  nodeId: BubbleNodeId,
  nodeLookup: ReadonlyMap<BubbleNodeId, BubbleNode>
): string {
  const node = nodeLookup.get(nodeId) as BubbleNode

  if (node.kind === 'text') {
    return node.value
  }

  return node.children
    .map(childId => deriveTextContent(childId, nodeLookup))
    .join('')
}

function deriveElementName(
  node: BubbleElementNode,
  nodeLookup: ReadonlyMap<BubbleNodeId, BubbleNode>
): string | null {
  const ariaLabel = normalizeAccessibleText(node.attributes['aria-label'] ?? '')

  if (ariaLabel !== null) {
    return ariaLabel
  }

  return normalizeAccessibleText(deriveTextContent(node.id, nodeLookup))
}

function isLabelElement(
  node: BubbleNode | undefined
): node is BubbleElementNode {
  return (
    node?.kind === 'element' &&
    node.namespace === 'html' &&
    node.tag === 'label'
  )
}

function isLabelableElement(
  node: BubbleNode | undefined
): node is BubbleElementNode {
  return (
    node?.kind === 'element' &&
    node.namespace === 'html' &&
    [
      'button',
      'input',
      'meter',
      'output',
      'progress',
      'select',
      'textarea',
    ].includes(node.tag)
  )
}

function findFirstLabelableDescendant(
  nodeId: BubbleNodeId,
  nodeLookup: ReadonlyMap<BubbleNodeId, BubbleNode>
): BubbleElementNode | null {
  const node = nodeLookup.get(nodeId)

  if (node === undefined || node.kind === 'text') {
    return null
  }

  for (const childId of node.children) {
    const childNode = nodeLookup.get(childId)

    if (isLabelableElement(childNode)) {
      return childNode
    }

    const nestedControl = findFirstLabelableDescendant(childId, nodeLookup)

    if (nestedControl !== null) {
      return nestedControl
    }
  }

  return null
}

function resolveLabelControl(
  labelId: BubbleNodeId,
  nodeLookup: ReadonlyMap<BubbleNodeId, BubbleNode>
): BubbleElementNode | null {
  const labelNode = nodeLookup.get(labelId)

  if (!isLabelElement(labelNode)) {
    return null
  }

  const explicitControlId = labelNode.attributes.for

  if (explicitControlId !== undefined) {
    for (const node of nodeLookup.values()) {
      if (
        isLabelableElement(node) &&
        node.attributes.id === explicitControlId
      ) {
        return node
      }
    }

    return null
  }

  return findFirstLabelableDescendant(labelId, nodeLookup)
}

export function createBubble(options: CreateBubbleOptions = {}): BubbleRuntime {
  let focusedNodeId: BubbleNodeId | null = null
  const capabilities = createBubbleCapabilityRuntime(options.capabilities)
  const listeners = new Set<BubbleRuntimeListener>()

  const emitRuntimeEvent = (event: BubbleRuntimeEvent): void => {
    for (const listener of listeners) {
      listener(event)
    }
  }

  const runtimeStore = createBubbleRuntimeStore({
    createQuery: createBubbleQuery,
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
  const getEventListeners = (): ReadonlyMap<
    BubbleNodeId,
    ReadonlyMap<string, readonly BubbleRegisteredListener[]>
  > => runtimeStore.getEventListeners()

  const getEventPath = (targetId: BubbleNodeId): BubbleNodeId[] => {
    const path: BubbleNodeId[] = []
    let currentId: BubbleNodeId | null = targetId

    while (currentId !== null) {
      const node = getNodes().get(currentId) as BubbleNode

      if (node.kind === 'element') {
        path.push(node.id)
      }

      currentId = node.kind === 'root' ? null : node.parentId
    }

    return path
  }

  const dispatchSingleEventToTarget = ({
    type,
    targetId,
    data,
    cancelable,
    mode,
  }: {
    readonly type: string
    readonly targetId: BubbleNodeId
    readonly data: Record<string, unknown>
    readonly cancelable: boolean
    readonly mode: BubbleEventDispatchMode
  }): BubbleDispatchResult => {
    assertValidEventType(type)
    const target = getNodes().get(targetId)

    if (target === undefined) {
      throw new Error(`Unknown node ID: ${targetId}`)
    }

    if (target.kind !== 'element') {
      return { defaultPrevented: false, delivered: false }
    }

    const targetQueue = (
      getEventListeners().get(targetId)?.get(type) ?? []
    ).slice()
    const deliveryQueue =
      mode === 'target-only'
        ? targetQueue.map(registration => ({
            nodeId: registration.handle.nodeId,
            phase: 'target' as BubbleEventPhase,
            registration,
          }))
        : (() => {
            const path = getEventPath(targetId)
            const ancestorPath = path.slice(1)
            const captureQueue = ancestorPath
              .slice()
              .reverse()
              .flatMap(nodeId =>
                (getEventListeners().get(nodeId)?.get(type) ?? []).filter(
                  registration => registration.handle.capture
                )
              )
            const bubbleQueue = ancestorPath.flatMap(nodeId =>
              (getEventListeners().get(nodeId)?.get(type) ?? []).filter(
                registration => !registration.handle.capture
              )
            )

            return [
              ...captureQueue.map(registration => ({
                nodeId: registration.handle.nodeId,
                phase: 'capture' as BubbleEventPhase,
                registration,
              })),
              ...targetQueue.map(registration => ({
                nodeId: registration.handle.nodeId,
                phase: 'target' as BubbleEventPhase,
                registration,
              })),
              ...bubbleQueue.map(registration => ({
                nodeId: registration.handle.nodeId,
                phase: 'bubble' as BubbleEventPhase,
                registration,
              })),
            ]
          })()

    if (deliveryQueue.length === 0) {
      return { defaultPrevented: false, delivered: false }
    }

    const eventData = Object.freeze({ ...data })
    let currentTargetId = targetId
    let phase: BubbleEventPhase = 'target'
    let defaultPrevented = false
    let propagationStopped = false
    let propagationStopNodeId: BubbleNodeId | null = null

    const event: BubbleEvent = {
      type,
      targetId,
      get currentTargetId() {
        return currentTargetId
      },
      get phase() {
        return phase
      },
      cancelable,
      get defaultPrevented() {
        return defaultPrevented
      },
      data: eventData,
      preventDefault() {
        if (cancelable) {
          defaultPrevented = true
        }
      },
      stopPropagation() {
        propagationStopped = true
        propagationStopNodeId = currentTargetId
      },
    }

    for (const queuedListener of deliveryQueue) {
      if (
        propagationStopped &&
        propagationStopNodeId !== null &&
        queuedListener.nodeId !== propagationStopNodeId
      ) {
        break
      }

      currentTargetId = queuedListener.nodeId
      phase = queuedListener.phase
      queuedListener.registration.listener(event)
    }

    return { defaultPrevented, delivered: true }
  }

  const serializeForm = (formId: BubbleNodeId): BubbleFormPayload => {
    const formNode = getNodes().get(formId)

    if (formNode === undefined) {
      throw new Error(`Unknown node ID: ${formId}`)
    }

    assertFormNode(formNode, formId)

    const entries: BubbleFormEntry[] = []
    const getElementChildNodeIds = (
      childNodeIds: readonly BubbleNodeId[]
    ): BubbleNodeId[] =>
      childNodeIds.filter(
        childNodeId => getNodes().get(childNodeId)?.kind === 'element'
      )
    const pendingNodeIds = getElementChildNodeIds(formNode.children)

    while (pendingNodeIds.length > 0) {
      const nodeId = pendingNodeIds.shift() as BubbleNodeId
      const node = getNodes().get(nodeId) as BubbleElementNode

      entries.push(...getFormEntriesForControl(node))
      pendingNodeIds.unshift(...getElementChildNodeIds(node.children))
    }

    return Object.freeze(entries.map(entry => Object.freeze({ ...entry })))
  }

  const dispatchEventToTarget = ({
    type,
    targetId,
    data = {},
    cancelable = type === 'submit',
    mode = 'propagating',
  }: BubbleDispatchInput & { mode?: BubbleEventDispatchMode }):
    | BubbleDispatchResult
    | BubbleSubmitDispatchResult => {
    if (type === 'submit') {
      const targetNode = getNodes().get(targetId)

      if (targetNode === undefined) {
        throw new Error(`Unknown node ID: ${targetId}`)
      }

      assertSubmitTargetNode(targetNode, targetId)

      const submitResult = dispatchSingleEventToTarget({
        type,
        targetId,
        data,
        cancelable,
        mode,
      })

      return {
        ...submitResult,
        payload: submitResult.defaultPrevented ? null : serializeForm(targetId),
      }
    }

    const initialResult = dispatchSingleEventToTarget({
      type,
      targetId,
      data,
      cancelable,
      mode,
    })

    if (mode !== 'propagating' || type !== 'click') {
      return initialResult
    }

    const associatedControl = resolveLabelControl(targetId, getNodes())

    if (associatedControl === null || initialResult.defaultPrevented) {
      return initialResult
    }

    const forwardedResult = dispatchSingleEventToTarget({
      type,
      targetId: associatedControl.id,
      data,
      cancelable,
      mode,
    })

    return {
      defaultPrevented:
        initialResult.defaultPrevented || forwardedResult.defaultPrevented,
      delivered: initialResult.delivered || forwardedResult.delivered,
    }
  }

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
    return dispatchEventToTarget({ type, targetId, data, cancelable })
  }

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

    visitNode(runtimeStore.rootId)

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
      return serializeForm(formId)
    },
    dispatchEvent,
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
        dispatchEventToTarget({
          type: 'blur',
          targetId: focusedNodeId,
          mode: 'target-only',
        })
      }

      focusedNodeId = id
      dispatchEventToTarget({
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
      dispatchEventToTarget({
        type: 'blur',
        targetId: previouslyFocusedNodeId,
        mode: 'target-only',
      })
      emitRuntimeEvent({ type: 'focus-changed', nodeId: null })
    },
    getFocusedNodeId() {
      return focusedNodeId
    },
    getTabOrder() {
      return getTabOrder()
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
