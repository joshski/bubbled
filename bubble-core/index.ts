import type {
  BubbleDispatchInput,
  BubbleDispatchResult,
  BubbleNode,
  BubbleNodeId,
  BubbleRuntime,
  BubbleRuntimeEvent,
  BubbleRuntimeListener,
  BubbleSubmitDispatchInput,
  BubbleSubmitDispatchResult,
  BubbleTransaction,
  CreateBubbleOptions,
} from './public-api'

import { createBubbleCapabilityRuntime } from './capabilities'
import {
  deriveElementName,
  deriveElementRole,
  isCheckboxInputElement,
} from './dom-semantics'
import { createBubbleEventRuntime } from './event-runtime'
import { createBubbleFocusNavigation } from './focus-navigation'
import { createBubbleQuery, serializeBubbleSnapshot } from './readonly-snapshot'
import { createBubbleRuntimeStore } from './runtime-store'
export type {
  BubbleDispatchInput,
  BubbleDispatchResult,
  BubbleElementNode,
  BubbleEvent,
  BubbleEventListener,
  BubbleFormEntry,
  BubbleFormPayload,
  BubbleListenerHandle,
  BubbleMutation,
  BubbleNamespace,
  BubbleNode,
  BubbleNodeId,
  BubbleQueryApi,
  BubbleRootNode,
  BubbleRuntime,
  BubbleRuntimeEvent,
  BubbleRuntimeListener,
  BubbleSerializedElementNode,
  BubbleSerializedNode,
  BubbleSerializedProperty,
  BubbleSerializedRootNode,
  BubbleSerializedTextNode,
  BubbleSnapshot,
  BubbleSubmitDispatchInput,
  BubbleSubmitDispatchResult,
  BubbleTextNode,
  BubbleTransaction,
  BubbleTransactionRecord,
  CreateBubbleOptions,
} from './public-api'
export { createBubbleQuery, serializeBubbleSnapshot } from './readonly-snapshot'

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
