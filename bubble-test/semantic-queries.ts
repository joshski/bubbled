import type { BubbleHarnessContext, BubbleSemanticQueries } from './index'

import { createSemanticContext } from './semantic-context'

function formatNameMatcher(name: string | RegExp): string {
  return typeof name === 'string' ? JSON.stringify(name) : name.toString()
}

function formatNodeName(name: string | null): string {
  return name === null ? '<unnamed>' : JSON.stringify(name)
}

function formatTextMatcher(text: string | RegExp): string {
  return typeof text === 'string' ? JSON.stringify(text) : text.toString()
}

export function createInternalSemanticQueries(
  target: BubbleHarnessContext
): BubbleSemanticQueries {
  const { getTextContent } = createSemanticContext(target)

  return {
    getByRole(role, options) {
      const snapshot = target.bubble.snapshot()
      const nodesByRole = snapshot.query.getByRole(role)
      const matchingNode = nodesByRole.find(node => {
        if (options?.name === undefined) {
          return true
        }

        if (typeof options.name === 'string') {
          return node.name === options.name
        }

        return node.name !== null && options.name.test(node.name)
      })

      if (matchingNode !== undefined) {
        return matchingNode.id
      }

      const queryDescription =
        options?.name === undefined
          ? `role ${JSON.stringify(role)}`
          : `role ${JSON.stringify(role)} and name ${formatNameMatcher(options.name)}`
      const nodesByRoleDescription =
        nodesByRole.length === 0
          ? 'No nodes with that role exist in the current bubble snapshot.'
          : `Nodes with role ${JSON.stringify(role)}: ${nodesByRole
              .map(node => `${node.id} (${formatNodeName(node.name)})`)
              .join(', ')}`

      throw new Error(
        `Unable to find a node with ${queryDescription}. ${nodesByRoleDescription}`
      )
    },
    getByText(text) {
      const snapshot = target.bubble.snapshot()
      const matchingNodes = Array.from(snapshot.nodes.values()).filter(node => {
        const textContent = getTextContent(node.id)

        if (typeof text === 'string') {
          return textContent === text
        }

        return text.test(textContent)
      })
      const elementOrTextNode = matchingNodes.find(node => node.kind !== 'root')

      if (elementOrTextNode !== undefined) {
        return elementOrTextNode.id
      }

      throw new Error(
        `Unable to find a node with text ${formatTextMatcher(text)}. Current root text content is ${JSON.stringify(
          getTextContent(snapshot.rootId)
        )}.`
      )
    },
  }
}
