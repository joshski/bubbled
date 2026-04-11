import type {
  BubbleElementNode,
  BubbleNode,
  BubbleNodeId,
  BubbleQueryApi,
  BubbleSerializedNode,
  BubbleSerializedProperty,
  BubbleSnapshot,
} from './public-api'

import { resolveLabelControl } from './dom-semantics'

export function createBubbleQuery(
  snapshot: Pick<BubbleSnapshot, 'nodes'>
): BubbleQueryApi {
  return Object.freeze({
    getById(id: BubbleNodeId): Readonly<BubbleNode> | null {
      return snapshot.nodes.get(id) ?? null
    },
    getByTag(tag: string): ReadonlyArray<Readonly<BubbleElementNode>> {
      const matchingNodes: Readonly<BubbleElementNode>[] = []

      for (const node of snapshot.nodes.values()) {
        if (node.kind === 'element' && node.tag === tag) {
          matchingNodes.push(node)
        }
      }

      return Object.freeze(matchingNodes)
    },
    getByRole(
      role: string,
      options?: { name?: string }
    ): ReadonlyArray<Readonly<BubbleElementNode>> {
      const matchingNodes: Readonly<BubbleElementNode>[] = []

      for (const node of snapshot.nodes.values()) {
        if (node.kind !== 'element' || node.role !== role) {
          continue
        }

        if (options?.name !== undefined && node.name !== options.name) {
          continue
        }

        matchingNodes.push(node)
      }

      return Object.freeze(matchingNodes)
    },
    getControlForLabel(
      labelId: BubbleNodeId
    ): Readonly<BubbleElementNode> | null {
      return resolveLabelControl(labelId, snapshot.nodes)
    },
  })
}

function compareKeys(left: string, right: string): number {
  return Number(left > right) - Number(left < right)
}

function serializeBubblePropertyValue(
  value: unknown
): BubbleSerializedProperty {
  if (value === null) {
    return null
  }

  if (
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map(item => serializeBubblePropertyValue(item)))
  }

  if (typeof value === 'object') {
    const serializedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => compareKeys(leftKey, rightKey))
      .map(
        ([key, nestedValue]) =>
          [key, serializeBubblePropertyValue(nestedValue)] as const
      )

    return Object.freeze(Object.fromEntries(serializedEntries))
  }

  throw new Error(
    `Unsupported property value in snapshot serialization: ${String(value)}`
  )
}

function serializeBubbleAttributes(
  attributes: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(attributes).sort(([leftKey], [rightKey]) =>
        compareKeys(leftKey, rightKey)
      )
    )
  )
}

function projectSerializedNode(
  nodeId: BubbleNodeId,
  nodes: ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>
): BubbleSerializedNode {
  const node = nodes.get(nodeId)

  if (node === undefined) {
    throw new Error(`Cannot serialize missing node: ${nodeId}`)
  }

  if (node.kind === 'root') {
    return Object.freeze({
      kind: 'root',
      children: Object.freeze(
        node.children.map(childId => projectSerializedNode(childId, nodes))
      ),
    })
  }

  if (node.kind === 'text') {
    return Object.freeze({
      kind: 'text',
      value: node.value,
    })
  }

  return Object.freeze({
    kind: 'element',
    tag: node.tag,
    namespace: node.namespace,
    attributes: serializeBubbleAttributes(node.attributes),
    properties: Object.freeze(
      Object.fromEntries(
        Object.entries(node.properties)
          .sort(([leftKey], [rightKey]) => compareKeys(leftKey, rightKey))
          .map(
            ([key, value]) =>
              [key, serializeBubblePropertyValue(value)] as const
          )
      )
    ),
    children: Object.freeze(
      node.children.map(childId => projectSerializedNode(childId, nodes))
    ),
  })
}

export function serializeBubbleSnapshot(snapshot: BubbleSnapshot): string {
  return JSON.stringify(
    projectSerializedNode(snapshot.rootId, snapshot.nodes),
    null,
    2
  )
}
