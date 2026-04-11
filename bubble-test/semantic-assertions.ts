import type { BubbleHarnessContext, BubbleSemanticAssertions } from './types'

import { createSemanticContext } from './semantic-context'

export function createInternalSemanticAssertions(
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
