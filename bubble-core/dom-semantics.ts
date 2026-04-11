import type { BubbleElementNode, BubbleNode, BubbleNodeId } from './index'

const LABELABLE_HTML_TAGS = new Set([
  'button',
  'input',
  'meter',
  'output',
  'progress',
  'select',
  'textarea',
])

const FOCUSABLE_HTML_TAGS = new Set(['button', 'input', 'select', 'textarea'])

export function getStringProperty(
  node: BubbleElementNode,
  name: string
): string | null {
  const propertyValue = node.properties[name]

  return typeof propertyValue === 'string' ? propertyValue : null
}

export function getInputType(node: BubbleElementNode): string | null {
  if (node.namespace !== 'html' || node.tag !== 'input') {
    return null
  }

  return (
    node.attributes.type ??
    getStringProperty(node, 'type') ??
    'text'
  ).toLowerCase()
}

export function isTextInputElement(
  node: BubbleElementNode
): node is BubbleElementNode & { value: string } {
  return getInputType(node) === 'text'
}

export function isCheckboxInputElement(node: BubbleElementNode): boolean {
  return getInputType(node) === 'checkbox'
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
    case 'input':
      return isTextInputElement(node) ? 'textbox' : null
    default:
      return null
  }
}

export function deriveElementRole(node: BubbleElementNode): string | null {
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

export function deriveElementName(
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
    LABELABLE_HTML_TAGS.has(node.tag)
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

export function isDisabledElement(node: BubbleElementNode): boolean {
  return (
    node.attributes.disabled !== undefined || node.properties.disabled === true
  )
}

export function getTabIndexValue(node: BubbleElementNode): number | null {
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

export function isTabbableElement(node: BubbleElementNode): boolean {
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
