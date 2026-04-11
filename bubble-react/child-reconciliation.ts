import type {
  BubbleListenerHandle,
  BubbleNodeId,
  BubbleTransaction,
} from '../bubble-core'
import type { BubbleReactElementPlan, BubbleReactPlan } from './planner'

import {
  EVENT_TYPE_BY_HANDLER_NAME,
  PROPERTY_DEFAULTS,
  type BubbleReactEventHandler,
  type BubbleReactEventHandlerName,
  type BubbleReactPropertyName,
} from './react-dom-bindings'

interface BubbleReactRegisteredEventHandler {
  handle: BubbleListenerHandle
  listener: BubbleReactEventHandler
}

interface BubbleReactTextNode {
  kind: 'text'
  key: string | null
  nodeId: BubbleNodeId
  value: string
}

interface BubbleReactElementNode {
  kind: 'element'
  key: string | null
  nodeId: BubbleNodeId
  tag: string
  attributes: Record<string, string>
  properties: Partial<Record<BubbleReactPropertyName, unknown>>
  eventHandlers: Partial<
    Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>
  >
  children: BubbleReactNode[]
}

export type BubbleReactNode = BubbleReactTextNode | BubbleReactElementNode

function canReuseNode(
  currentNode: BubbleReactNode,
  plan: BubbleReactPlan
): boolean {
  return (
    currentNode.key === plan.key &&
    currentNode.kind === plan.kind &&
    (plan.kind === 'text' ||
      (currentNode.kind === 'element' && currentNode.tag === plan.tag))
  )
}

function reconcileAttributes(
  currentNode: BubbleReactElementNode,
  plan: BubbleReactElementPlan,
  tx: BubbleTransaction
): void {
  for (const [name, value] of Object.entries(plan.attributes)) {
    if (currentNode.attributes[name] !== value) {
      tx.setAttribute({ nodeId: currentNode.nodeId, name, value })
    }
  }

  for (const name of Object.keys(currentNode.attributes)) {
    if (!(name in plan.attributes)) {
      tx.removeAttribute({ nodeId: currentNode.nodeId, name })
    }
  }
}

function reconcileProperties(
  currentNode: BubbleReactElementNode,
  plan: BubbleReactElementPlan,
  tx: BubbleTransaction
): void {
  for (const [name, value] of Object.entries(plan.properties) as [
    BubbleReactPropertyName,
    unknown,
  ][]) {
    if (!Object.is(currentNode.properties[name], value)) {
      tx.setProperty({ nodeId: currentNode.nodeId, name, value })
    }
  }

  for (const name of Object.keys(
    currentNode.properties
  ) as BubbleReactPropertyName[]) {
    if (!(name in plan.properties)) {
      tx.setProperty({
        nodeId: currentNode.nodeId,
        name,
        value: PROPERTY_DEFAULTS[name],
      })
    }
  }
}

function reconcileEventHandlers(
  currentNode: BubbleReactElementNode,
  plan: BubbleReactElementPlan,
  tx: BubbleTransaction
): Partial<
  Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>
> {
  const nextEventHandlers: Partial<
    Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>
  > = {}

  for (const name of Object.keys(
    currentNode.eventHandlers
  ) as BubbleReactEventHandlerName[]) {
    const currentHandler = currentNode.eventHandlers[
      name
    ] as BubbleReactRegisteredEventHandler
    const nextListener = plan.eventHandlers[name]

    if (nextListener !== currentHandler.listener) {
      tx.removeEventListener(currentHandler.handle)
    }
  }

  for (const name of Object.keys(
    plan.eventHandlers
  ) as BubbleReactEventHandlerName[]) {
    const nextListener = plan.eventHandlers[name] as BubbleReactEventHandler
    const currentHandler = currentNode.eventHandlers[name]

    if (
      currentHandler !== undefined &&
      currentHandler.listener === nextListener
    ) {
      nextEventHandlers[name] = currentHandler
      continue
    }

    nextEventHandlers[name] = {
      handle: tx.addEventListener({
        nodeId: currentNode.nodeId,
        type: EVENT_TYPE_BY_HANDLER_NAME[name],
        listener: nextListener,
      }),
      listener: nextListener,
    }
  }

  return nextEventHandlers
}

function removeEventHandlersFromSubtree(
  node: BubbleReactNode,
  tx: BubbleTransaction
): void {
  if (node.kind === 'text') {
    return
  }

  for (const name of Object.keys(
    node.eventHandlers
  ) as BubbleReactEventHandlerName[]) {
    tx.removeEventListener(node.eventHandlers[name]!.handle)
  }

  for (const child of node.children) {
    removeEventHandlersFromSubtree(child, tx)
  }
}

function createNode(
  plan: BubbleReactPlan,
  tx: BubbleTransaction
): BubbleReactNode {
  if (plan.kind === 'text') {
    return {
      kind: 'text',
      key: plan.key,
      nodeId: tx.createText({ value: plan.value }),
      value: plan.value,
    }
  }

  const nodeId = tx.createElement({ tag: plan.tag })

  for (const [name, value] of Object.entries(plan.attributes)) {
    tx.setAttribute({ nodeId, name, value })
  }

  for (const [name, value] of Object.entries(plan.properties) as [
    BubbleReactPropertyName,
    unknown,
  ][]) {
    tx.setProperty({ nodeId, name, value })
  }

  const eventHandlers = Object.fromEntries(
    (Object.keys(plan.eventHandlers) as BubbleReactEventHandlerName[]).map(
      name => [
        name,
        {
          handle: tx.addEventListener({
            nodeId,
            type: EVENT_TYPE_BY_HANDLER_NAME[name],
            listener: plan.eventHandlers[name] as BubbleReactEventHandler,
          }),
          listener: plan.eventHandlers[name] as BubbleReactEventHandler,
        },
      ]
    )
  ) as Partial<
    Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>
  >

  const children = reconcileChildren({
    parentId: nodeId,
    currentChildren: [],
    nextPlans: plan.children,
    tx,
  })

  return {
    kind: 'element',
    key: plan.key,
    nodeId,
    tag: plan.tag,
    attributes: { ...plan.attributes },
    properties: { ...plan.properties },
    eventHandlers,
    children,
  }
}

function reconcileNode(
  currentNode: BubbleReactNode,
  plan: BubbleReactPlan,
  tx: BubbleTransaction
): BubbleReactNode {
  if (currentNode.kind === 'text' && plan.kind === 'text') {
    if (currentNode.value !== plan.value) {
      tx.setText({ nodeId: currentNode.nodeId, value: plan.value })
    }

    return {
      kind: 'text',
      key: plan.key,
      nodeId: currentNode.nodeId,
      value: plan.value,
    }
  }

  const currentElementNode = currentNode as BubbleReactElementNode
  const elementPlan = plan as BubbleReactElementPlan

  reconcileAttributes(currentElementNode, elementPlan, tx)
  reconcileProperties(currentElementNode, elementPlan, tx)
  const eventHandlers = reconcileEventHandlers(
    currentElementNode,
    elementPlan,
    tx
  )

  return {
    kind: 'element',
    key: elementPlan.key,
    nodeId: currentElementNode.nodeId,
    tag: currentElementNode.tag,
    attributes: { ...elementPlan.attributes },
    properties: { ...elementPlan.properties },
    eventHandlers,
    children: reconcileChildren({
      parentId: currentElementNode.nodeId,
      currentChildren: currentElementNode.children,
      nextPlans: elementPlan.children,
      tx,
    }),
  }
}

export function reconcileChildren(input: {
  parentId: BubbleNodeId
  currentChildren: readonly BubbleReactNode[]
  nextPlans: readonly BubbleReactPlan[]
  tx: BubbleTransaction
}): BubbleReactNode[] {
  const hasKeyedChildren =
    input.currentChildren.some(child => child.key !== null) ||
    input.nextPlans.some(plan => plan.key !== null)

  if (!hasKeyedChildren) {
    const nextChildren: BubbleReactNode[] = []

    for (const [index, plan] of input.nextPlans.entries()) {
      const currentNode = input.currentChildren[index]

      if (currentNode === undefined) {
        const createdNode = createNode(plan, input.tx)
        input.tx.insertChild({
          parentId: input.parentId,
          childId: createdNode.nodeId,
          index,
        })
        nextChildren.push(createdNode)
        continue
      }

      if (canReuseNode(currentNode, plan)) {
        nextChildren.push(reconcileNode(currentNode, plan, input.tx))
        continue
      }

      removeEventHandlersFromSubtree(currentNode, input.tx)
      input.tx.removeChild({
        parentId: input.parentId,
        childId: currentNode.nodeId,
      })
      const createdNode = createNode(plan, input.tx)
      input.tx.insertChild({
        parentId: input.parentId,
        childId: createdNode.nodeId,
        index,
      })
      nextChildren.push(createdNode)
    }

    for (
      let index = input.currentChildren.length - 1;
      index >= input.nextPlans.length;
      index -= 1
    ) {
      removeEventHandlersFromSubtree(
        input.currentChildren[index] as BubbleReactNode,
        input.tx
      )
      input.tx.removeChild({
        parentId: input.parentId,
        childId: input.currentChildren[index]!.nodeId,
      })
    }

    return nextChildren
  }

  const nextChildren: BubbleReactNode[] = []
  const workingChildren = [...input.currentChildren]
  const currentChildrenByKey = new Map<string, BubbleReactNode>()
  const unmatchedUnkeyedChildren = input.currentChildren.filter(
    child => child.key === null
  )
  const reusedNodeIds = new Set<BubbleNodeId>()

  for (const child of input.currentChildren) {
    if (child.key !== null) {
      currentChildrenByKey.set(child.key, child)
    }
  }

  for (const [index, plan] of input.nextPlans.entries()) {
    let currentNode: BubbleReactNode | undefined

    if (plan.key !== null) {
      currentNode = currentChildrenByKey.get(plan.key)
    } else {
      currentNode = unmatchedUnkeyedChildren.shift()
    }

    if (currentNode !== undefined && canReuseNode(currentNode, plan)) {
      const nextNode = reconcileNode(currentNode, plan, input.tx)
      const currentIndex = workingChildren.findIndex(
        child => child.nodeId === currentNode.nodeId
      )

      if (currentIndex !== index) {
        input.tx.moveChild({
          parentId: input.parentId,
          childId: currentNode.nodeId,
          index,
        })
        const [movedNode] = workingChildren.splice(currentIndex, 1)
        workingChildren.splice(index, 0, movedNode as BubbleReactNode)
      }

      reusedNodeIds.add(currentNode.nodeId)
      nextChildren.push(nextNode)
      continue
    }

    const createdNode = createNode(plan, input.tx)
    input.tx.insertChild({
      parentId: input.parentId,
      childId: createdNode.nodeId,
      index,
    })
    workingChildren.splice(index, 0, createdNode)
    nextChildren.push(createdNode)
  }

  for (const child of input.currentChildren) {
    if (reusedNodeIds.has(child.nodeId)) {
      continue
    }

    removeEventHandlersFromSubtree(child, input.tx)
    input.tx.removeChild({
      parentId: input.parentId,
      childId: child.nodeId,
    })
  }

  return nextChildren
}
