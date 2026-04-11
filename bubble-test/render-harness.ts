import type { BubbleRenderContent, BubbleRenderHarness } from './types'

import {
  createBubble,
  type BubbleDispatchResult,
  type BubbleNamespace,
  type BubbleNodeId,
  type BubbleRuntime,
  type BubbleTransaction,
} from '../bubble-core'

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

type RenderedNode = RenderedTextNode | RenderedElementNode

function isRenderContentArray(
  value: BubbleRenderContent | readonly BubbleRenderContent[]
): value is readonly BubbleRenderContent[] {
  return Array.isArray(value)
}

export function createRenderHarness(
  bubble: BubbleRuntime = createBubble()
): BubbleRenderHarness {
  let currentBubble = bubble
  let renderedRoots: readonly RenderedNode[] = []

  const getRootContent = (
    content: BubbleRenderContent | readonly BubbleRenderContent[]
  ): readonly BubbleRenderContent[] =>
    isRenderContentArray(content) ? content : [content]

  const createRenderedNode = (
    tx: BubbleTransaction,
    parentId: BubbleNodeId,
    content: BubbleRenderContent,
    index: number
  ): RenderedNode => {
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

  const reconcileRenderedNode = (
    tx: BubbleTransaction,
    parentId: BubbleNodeId,
    previousNode: RenderedNode,
    nextContent: BubbleRenderContent,
    index: number
  ): RenderedNode => {
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

  const dispatchEvent = (
    targetId: BubbleNodeId,
    type: string
  ): BubbleDispatchResult => {
    if (currentBubble.getNode(targetId) === null) {
      throw new Error(
        `Unable to dispatch ${JSON.stringify(type)} event. Unknown node ID: ${targetId}`
      )
    }

    return currentBubble.dispatchEvent({ type, targetId })
  }

  return {
    get bubble() {
      return currentBubble
    },
    render(content) {
      const rootContent = getRootContent(content)

      renderedRoots = currentBubble.transact(tx => {
        const nextRenderedRoots: RenderedNode[] = []
        const sharedLength = Math.min(renderedRoots.length, rootContent.length)

        for (let index = 0; index < sharedLength; index += 1) {
          nextRenderedRoots.push(
            reconcileRenderedNode(
              tx,
              currentBubble.rootId,
              renderedRoots[index]!,
              rootContent[index]!,
              index
            )
          )
        }

        for (
          let index = renderedRoots.length - 1;
          index >= rootContent.length;
          index -= 1
        ) {
          tx.removeChild({
            parentId: currentBubble.rootId,
            childId: renderedRoots[index]!.nodeId,
          })
        }

        for (let index = sharedLength; index < rootContent.length; index += 1) {
          nextRenderedRoots.push(
            createRenderedNode(
              tx,
              currentBubble.rootId,
              rootContent[index]!,
              index
            )
          )
        }

        return Object.freeze(nextRenderedRoots)
      })
    },
    cleanup() {
      currentBubble = createBubble()
      renderedRoots = []
    },
    click(target) {
      return dispatchEvent(target, 'click')
    },
    tab(options = {}) {
      const tabOrder = currentBubble.getTabOrder()

      if (tabOrder.length === 0) {
        return
      }

      const currentFocusId = currentBubble.getFocusedNodeId()
      const currentIndex =
        currentFocusId === null ? -1 : tabOrder.indexOf(currentFocusId)

      if (options.shift) {
        if (currentIndex === -1) {
          currentBubble.focus(tabOrder.at(-1)!)
          return
        }

        if (currentIndex === 0) {
          return
        }

        currentBubble.focus(tabOrder[currentIndex - 1]!)
        return
      }

      if (currentIndex === -1) {
        currentBubble.focus(tabOrder[0]!)
        return
      }

      if (currentIndex === tabOrder.length - 1) {
        return
      }

      currentBubble.focus(tabOrder[currentIndex + 1]!)
    },
  }
}
