import type {
  BubbleNamespace,
  BubbleNodeId,
  BubbleTransaction,
} from '../bubble-core'
import type { BubbleRenderContent } from './types'

interface RenderedTextNode {
  readonly kind: 'text'
  readonly nodeId: BubbleNodeId
  readonly value: string
}

interface RenderedElementNode {
  readonly kind: 'element'
  readonly nodeId: BubbleNodeId
  readonly tag: string
  readonly namespace: BubbleNamespace
  readonly attributes: Readonly<Record<string, string>>
  readonly properties: Readonly<Record<string, unknown>>
  readonly children: readonly RenderedNode[]
}

export type RenderedNode = RenderedTextNode | RenderedElementNode

function isRenderContentArray(
  value: BubbleRenderContent | readonly BubbleRenderContent[]
): value is readonly BubbleRenderContent[] {
  return Array.isArray(value)
}

export function normalizeRootContent(
  content: BubbleRenderContent | readonly BubbleRenderContent[]
): readonly BubbleRenderContent[] {
  return isRenderContentArray(content) ? content : [content]
}

function createRenderedNode(
  tx: BubbleTransaction,
  parentId: BubbleNodeId,
  content: BubbleRenderContent,
  index: number
): RenderedNode {
  if (typeof content === 'string') {
    const nodeId = tx.createText({ value: content })
    tx.insertChild({ parentId, childId: nodeId, index })

    return {
      kind: 'text',
      nodeId,
      value: content,
    }
  }

  const nodeId = tx.createElement({
    tag: content.tag,
    namespace: content.namespace,
  })

  for (const [name, value] of Object.entries(content.attributes ?? {})) {
    tx.setAttribute({ nodeId, name, value })
  }

  for (const [name, value] of Object.entries(content.properties ?? {})) {
    tx.setProperty({ nodeId, name, value })
  }

  tx.insertChild({ parentId, childId: nodeId, index })

  const children = (content.children ?? []).map((child, childIndex) =>
    createRenderedNode(tx, nodeId, child, childIndex)
  )

  return {
    kind: 'element',
    nodeId,
    tag: content.tag,
    namespace: content.namespace ?? 'html',
    attributes: Object.freeze({ ...(content.attributes ?? {}) }),
    properties: Object.freeze({ ...(content.properties ?? {}) }),
    children: Object.freeze(children),
  }
}

function reconcileRenderedNode(
  tx: BubbleTransaction,
  parentId: BubbleNodeId,
  previousNode: RenderedNode,
  nextContent: BubbleRenderContent,
  index: number
): RenderedNode {
  if (typeof nextContent === 'string') {
    if (previousNode.kind === 'text') {
      if (previousNode.value !== nextContent) {
        tx.setText({ nodeId: previousNode.nodeId, value: nextContent })
      }

      return {
        kind: 'text',
        nodeId: previousNode.nodeId,
        value: nextContent,
      }
    }

    tx.removeChild({ parentId, childId: previousNode.nodeId })
    return createRenderedNode(tx, parentId, nextContent, index)
  }

  if (
    previousNode.kind === 'element' &&
    previousNode.tag === nextContent.tag &&
    previousNode.namespace === (nextContent.namespace ?? 'html')
  ) {
    const nextAttributes = nextContent.attributes ?? {}
    const nextProperties = nextContent.properties ?? {}

    for (const [name, value] of Object.entries(nextAttributes)) {
      if (previousNode.attributes[name] !== value) {
        tx.setAttribute({ nodeId: previousNode.nodeId, name, value })
      }
    }

    for (const name of Object.keys(previousNode.attributes)) {
      if (!(name in nextAttributes)) {
        tx.removeAttribute({ nodeId: previousNode.nodeId, name })
      }
    }

    for (const [name, value] of Object.entries(nextProperties)) {
      if (previousNode.properties[name] !== value) {
        tx.setProperty({ nodeId: previousNode.nodeId, name, value })
      }
    }

    const nextChildrenContent = nextContent.children ?? []
    const nextChildren: RenderedNode[] = []
    const sharedLength = Math.min(
      previousNode.children.length,
      nextChildrenContent.length
    )

    for (let childIndex = 0; childIndex < sharedLength; childIndex += 1) {
      nextChildren.push(
        reconcileRenderedNode(
          tx,
          previousNode.nodeId,
          previousNode.children[childIndex]!,
          nextChildrenContent[childIndex]!,
          childIndex
        )
      )
    }

    for (
      let childIndex = previousNode.children.length - 1;
      childIndex >= nextChildrenContent.length;
      childIndex -= 1
    ) {
      tx.removeChild({
        parentId: previousNode.nodeId,
        childId: previousNode.children[childIndex]!.nodeId,
      })
    }

    for (
      let childIndex = sharedLength;
      childIndex < nextChildrenContent.length;
      childIndex += 1
    ) {
      nextChildren.push(
        createRenderedNode(
          tx,
          previousNode.nodeId,
          nextChildrenContent[childIndex]!,
          childIndex
        )
      )
    }

    return {
      kind: 'element',
      nodeId: previousNode.nodeId,
      tag: previousNode.tag,
      namespace: previousNode.namespace,
      attributes: Object.freeze({ ...nextAttributes }),
      properties: Object.freeze({ ...nextProperties }),
      children: Object.freeze(nextChildren),
    }
  }

  tx.removeChild({ parentId, childId: previousNode.nodeId })
  return createRenderedNode(tx, parentId, nextContent, index)
}

export function reconcileRenderedRoots(
  tx: BubbleTransaction,
  parentId: BubbleNodeId,
  previousRoots: readonly RenderedNode[],
  nextContent: readonly BubbleRenderContent[]
): readonly RenderedNode[] {
  const nextRenderedRoots: RenderedNode[] = []
  const sharedLength = Math.min(previousRoots.length, nextContent.length)

  for (let index = 0; index < sharedLength; index += 1) {
    nextRenderedRoots.push(
      reconcileRenderedNode(
        tx,
        parentId,
        previousRoots[index]!,
        nextContent[index]!,
        index
      )
    )
  }

  for (
    let index = previousRoots.length - 1;
    index >= nextContent.length;
    index -= 1
  ) {
    tx.removeChild({
      parentId,
      childId: previousRoots[index]!.nodeId,
    })
  }

  for (let index = sharedLength; index < nextContent.length; index += 1) {
    nextRenderedRoots.push(
      createRenderedNode(tx, parentId, nextContent[index]!, index)
    )
  }

  return Object.freeze(nextRenderedRoots)
}
