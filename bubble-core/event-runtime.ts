import type {
  BubbleDispatchInput,
  BubbleDispatchResult,
  BubbleElementNode,
  BubbleEvent,
  BubbleEventListener,
  BubbleFormEntry,
  BubbleFormPayload,
  BubbleListenerHandle,
  BubbleNode,
  BubbleNodeId,
  BubbleSubmitDispatchResult,
  BubbleTransaction,
} from './index'

export interface BubbleRegisteredListener {
  handle: BubbleListenerHandle
  listener: BubbleEventListener
}

type BubbleEventListenerMap = Map<
  BubbleNodeId,
  Map<string, BubbleRegisteredListener[]>
>

type BubbleEventPhase = BubbleEvent['phase']
type BubbleEventDispatchMode = 'propagating' | 'target-only'

interface BubbleEventTransactionParticipant {
  api: Pick<BubbleTransaction, 'addEventListener' | 'removeEventListener'>
  commit(): void
}

interface CreateBubbleEventRuntimeOptions {
  getNodes(): ReadonlyMap<BubbleNodeId, BubbleNode>
}

export interface BubbleEventRuntime {
  createTransactionParticipant(input: {
    getDraftNode(id: BubbleNodeId): BubbleNode
  }): BubbleEventTransactionParticipant
  serializeForm(formId: BubbleNodeId): BubbleFormPayload
  dispatchEvent(
    input: BubbleDispatchInput & { mode?: BubbleEventDispatchMode }
  ): BubbleDispatchResult | BubbleSubmitDispatchResult
}

const EVENT_TYPE_ERROR = 'Event type must be a non-empty string'

let nextBubbleEventRuntimeId = 0

function assertValidEventType(type: unknown): asserts type is string {
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw new Error(EVENT_TYPE_ERROR)
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

function isDisabledElement(node: BubbleElementNode): boolean {
  return (
    node.attributes.disabled !== undefined || node.properties.disabled === true
  )
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

export function resolveLabelControl(
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

export function createBubbleEventRuntime({
  getNodes,
}: CreateBubbleEventRuntimeOptions): BubbleEventRuntime {
  let eventListeners: BubbleEventListenerMap = new Map()
  nextBubbleEventRuntimeId += 1
  const runtimeId = nextBubbleEventRuntimeId
  let nextListenerId = 0

  const allocateListenerId = (): string => {
    nextListenerId += 1

    return `listener:${runtimeId}:${nextListenerId}`
  }

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
    type: string
    targetId: BubbleNodeId
    data: Record<string, unknown>
    cancelable: boolean
    mode: BubbleEventDispatchMode
  }): BubbleDispatchResult => {
    assertValidEventType(type)
    const target = getNodes().get(targetId)

    if (target === undefined) {
      throw new Error(`Unknown node ID: ${targetId}`)
    }

    if (target.kind !== 'element') {
      return { defaultPrevented: false, delivered: false }
    }

    const targetQueue = (eventListeners.get(targetId)?.get(type) ?? []).slice()
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
                (eventListeners.get(nodeId)?.get(type) ?? []).filter(
                  registration => registration.handle.capture
                )
              )
            const bubbleQueue = ancestorPath.flatMap(nodeId =>
              (eventListeners.get(nodeId)?.get(type) ?? []).filter(
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

  return {
    createTransactionParticipant({ getDraftNode }) {
      const draftEventListeners = cloneEventListeners(eventListeners)

      return {
        api: {
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
              registration =>
                registration.handle.internalId !== handle.internalId
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
        },
        commit() {
          eventListeners = draftEventListeners
        },
      }
    },
    serializeForm,
    dispatchEvent({
      type,
      targetId,
      data = {},
      cancelable = type === 'submit',
      mode = 'propagating',
    }) {
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
          payload: submitResult.defaultPrevented
            ? null
            : serializeForm(targetId),
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
    },
  }
}
