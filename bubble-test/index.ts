import {
  createBubble,
  type BubbleDispatchResult,
  type BubbleNamespace,
  type BubbleNodeId,
  type BubbleRuntime,
  type BubbleTransaction,
} from '../bubble-core'
import { createSemanticContext } from './semantic-context'
import { createInternalSemanticQueries } from './semantic-queries'

export interface BubbleRenderElement {
  readonly tag: string
  readonly namespace?: BubbleNamespace
  readonly attributes?: Readonly<Record<string, string>>
  readonly properties?: Readonly<Record<string, unknown>>
  readonly children?: readonly BubbleRenderContent[]
}

export type BubbleRenderContent = string | BubbleRenderElement

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

export interface BubbleHarnessContext {
  readonly bubble: BubbleRuntime
}

export interface BubbleRenderHarness extends BubbleHarnessContext {
  render(content: BubbleRenderContent | readonly BubbleRenderContent[]): void
  cleanup(): void
  click(target: BubbleNodeId): BubbleDispatchResult
  tab(options?: { shift?: boolean }): void
}

export interface BubbleSemanticQueries {
  getByRole(role: string, options?: { name?: string | RegExp }): string
  getByText(text: string | RegExp): string
}

export interface BubbleSemanticAssertions {
  expectRole(target: BubbleNodeId, role: string): void
  expectName(target: BubbleNodeId, name: string | null): void
  expectText(target: BubbleNodeId, value: string): void
  expectFocused(target: BubbleNodeId): void
  expectValue(target: BubbleNodeId, value: string): void
  expectChecked(target: BubbleNodeId, checked: boolean): void
}

export type BubbleHarness = BubbleRenderHarness &
  BubbleSemanticQueries &
  BubbleSemanticAssertions

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

export function createSemanticQueries(
  target: BubbleHarnessContext
): BubbleSemanticQueries {
  return createInternalSemanticQueries(target)
}

export function createSemanticAssertions(
  target: BubbleHarnessContext
): BubbleSemanticAssertions {
  const { assertEqual, describeNode, expectElementNode, getTextContent } =
    createSemanticContext(target)

  return {
    expectRole(targetId, role) {
      const node = expectElementNode(targetId)
      const actualRole = node.role

      if (actualRole !== role) {
        throw new Error(
          `Expected role for ${targetId} to be ${JSON.stringify(role)}. Received ${
            actualRole === null ? 'null' : JSON.stringify(actualRole)
          }. ${describeNode(targetId)}`
        )
      }
    },
    expectName(targetId, name) {
      const node = expectElementNode(targetId)
      const actualName = node.name

      if (actualName !== name) {
        throw new Error(
          `Expected accessible name for ${targetId} to be ${JSON.stringify(
            name
          )}. Received ${JSON.stringify(actualName)}. ${describeNode(targetId)}`
        )
      }
    },
    expectText(targetId, value) {
      assertEqual('text content', targetId, value, getTextContent(targetId))
    },
    expectFocused(targetId) {
      const actualFocusedId = target.bubble.getFocusedNodeId()

      if (actualFocusedId !== targetId) {
        throw new Error(
          `Expected focused node to be ${targetId}. Received ${actualFocusedId ?? 'null'}. ${describeNode(targetId)}`
        )
      }
    },
    expectValue(targetId, value) {
      const node = expectElementNode(targetId)
      const actualValue = node.value

      if (actualValue !== value) {
        throw new Error(
          `Expected value for ${targetId} to be ${JSON.stringify(value)}. Received ${JSON.stringify(actualValue)}. ${describeNode(targetId)}`
        )
      }
    },
    expectChecked(targetId, checked) {
      const node = expectElementNode(targetId)
      const actualChecked = node.checked

      if (actualChecked !== checked) {
        throw new Error(
          `Expected checked state for ${targetId} to be ${checked}. Received ${JSON.stringify(actualChecked)}. ${describeNode(targetId)}`
        )
      }
    },
  }
}

export function createHarness(
  bubble: BubbleRuntime = createBubble()
): BubbleHarness {
  const renderHarness = createRenderHarness(bubble)
  return Object.assign(
    renderHarness,
    createSemanticQueries(renderHarness),
    createSemanticAssertions(renderHarness)
  )
}
