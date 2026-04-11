import type {
  BubbleElementNode,
  BubbleFormEntry,
  BubbleFormPayload,
  BubbleNode,
  BubbleNodeId,
} from './index'

import {
  getStringProperty,
  isCheckboxInputElement,
  isDisabledElement,
  isTextInputElement,
} from './dom-semantics'

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

export function serializeForm(
  formId: BubbleNodeId,
  nodeLookup: ReadonlyMap<BubbleNodeId, BubbleNode>
): BubbleFormPayload {
  const formNode = nodeLookup.get(formId)

  if (formNode === undefined) {
    throw new Error(`Unknown node ID: ${formId}`)
  }

  assertFormNode(formNode, formId)

  const entries: BubbleFormEntry[] = []
  const getElementChildNodeIds = (
    childNodeIds: readonly BubbleNodeId[]
  ): BubbleNodeId[] =>
    childNodeIds.filter(
      childNodeId => nodeLookup.get(childNodeId)?.kind === 'element'
    )
  const pendingNodeIds = getElementChildNodeIds(formNode.children)

  while (pendingNodeIds.length > 0) {
    const nodeId = pendingNodeIds.shift() as BubbleNodeId
    const node = nodeLookup.get(nodeId) as BubbleElementNode

    entries.push(...getFormEntriesForControl(node))
    pendingNodeIds.unshift(...getElementChildNodeIds(node.children))
  }

  return Object.freeze(entries.map(entry => Object.freeze({ ...entry })))
}
