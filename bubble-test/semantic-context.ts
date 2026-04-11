import type { BubbleNodeId } from '../bubble-core'
import type { BubbleHarnessContext } from './types'

export function createSemanticContext(target: BubbleHarnessContext) {
  const getNodeOrThrow = (targetId: BubbleNodeId) => {
    const node = target.bubble.getNode(targetId)

    if (node === null) {
      throw new Error(`Unknown node ID: ${targetId}`)
    }

    return node
  }

  const getTextContent = (targetId: BubbleNodeId): string => {
    const node = getNodeOrThrow(targetId)

    if (node.kind === 'text') {
      return node.value
    }

    return node.children.map(childId => getTextContent(childId)).join('')
  }

  const describeNode = (targetId: BubbleNodeId): string => {
    const node = getNodeOrThrow(targetId)

    if (node.kind === 'root') {
      return `${node.id} <root>`
    }

    if (node.kind === 'text') {
      return `${node.id} <text ${JSON.stringify(node.value)}>`
    }

    const details = [
      `tag=${JSON.stringify(node.tag)}`,
      `role=${node.role === null ? 'null' : JSON.stringify(node.role)}`,
      `name=${node.name === null ? 'null' : JSON.stringify(node.name)}`,
      `text=${JSON.stringify(getTextContent(node.id))}`,
      `focused=${target.bubble.getFocusedNodeId() === node.id}`,
    ]

    if (node.value !== null) {
      details.push(`value=${JSON.stringify(node.value)}`)
    }

    if (node.checked !== null) {
      details.push(`checked=${node.checked}`)
    }

    return `${node.id} <${node.tag} ${details.join(' ')}>`
  }

  const expectElementNode = (targetId: BubbleNodeId) => {
    const node = getNodeOrThrow(targetId)

    if (node.kind !== 'element') {
      throw new Error(
        `Expected an element node for ${targetId}. Received ${describeNode(targetId)}.`
      )
    }

    return node
  }

  const assertEqual = (
    label: string,
    targetId: BubbleNodeId,
    expected: string,
    actual: string
  ): void => {
    if (actual !== expected) {
      throw new Error(
        `Expected ${label} for ${targetId} to be ${JSON.stringify(expected)}. Received ${JSON.stringify(actual)}. ${describeNode(
          targetId
        )}`
      )
    }
  }

  return {
    assertEqual,
    describeNode,
    expectElementNode,
    getTextContent,
  }
}
