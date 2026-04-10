export type BubbleNodeId = string;

export type BubbleNamespace = "html" | "svg";

export interface BubbleRootNode {
  id: BubbleNodeId;
  kind: "root";
  children: BubbleNodeId[];
}

export interface BubbleElementNode {
  id: BubbleNodeId;
  kind: "element";
  tag: string;
  namespace: BubbleNamespace;
  parentId: BubbleNodeId | null;
  children: BubbleNodeId[];
  attributes: Record<string, string>;
  properties: Record<string, unknown>;
}

export interface BubbleTextNode {
  id: BubbleNodeId;
  kind: "text";
  parentId: BubbleNodeId | null;
  value: string;
}

export type BubbleNode = BubbleRootNode | BubbleElementNode | BubbleTextNode;

export interface BubbleTransaction {
  createElement(input: { tag: string; namespace?: BubbleNamespace }): BubbleNodeId;
  createText(input: { value: string }): BubbleNodeId;
  setText(input: {
    nodeId: BubbleNodeId;
    value: string;
  }): void;
  insertChild(input: {
    parentId: BubbleNodeId;
    childId: BubbleNodeId;
    index?: number;
  }): void;
  removeChild(input: {
    parentId: BubbleNodeId;
    childId: BubbleNodeId;
  }): void;
  moveChild(input: {
    parentId: BubbleNodeId;
    childId: BubbleNodeId;
    index: number;
  }): void;
  setAttribute(input: {
    nodeId: BubbleNodeId;
    name: string;
    value: string;
  }): void;
  removeAttribute(input: {
    nodeId: BubbleNodeId;
    name: string;
  }): void;
  setProperty(input: {
    nodeId: BubbleNodeId;
    name: string;
    value: unknown;
  }): void;
}

export interface BubbleTransactionRecord {
  mutations: readonly [];
}

export type BubbleRuntimeEvent = {
  type: "transaction-committed";
  record: BubbleTransactionRecord;
};

export type BubbleRuntimeListener = (event: BubbleRuntimeEvent) => void;

export interface BubbleRuntime {
  readonly rootId: BubbleNodeId;
  transact<T>(fn: (tx: BubbleTransaction) => T): T;
  getNode(id: BubbleNodeId): Readonly<BubbleNode> | null;
  getRoot(): Readonly<BubbleRootNode>;
  subscribe(listener: BubbleRuntimeListener): () => void;
}

const ROOT_NODE_ID = "root";
const NODE_ID_PREFIX = "node:";

const ELEMENT_TAG_ERROR = "Element tag must be a non-empty string";
const TEXT_VALUE_ERROR = "Text value must be a string";
const CHILD_INDEX_ERROR = "Child index must be an integer within the parent child range";
const NESTED_TRANSACTION_ERROR = "Nested transactions are not supported";

let nextBubbleInstanceId = 0;

function assertValidElementTag(tag: unknown): asserts tag is string {
  if (typeof tag !== "string" || tag.trim().length === 0) {
    throw new Error(ELEMENT_TAG_ERROR);
  }
}

function assertValidTextValue(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(TEXT_VALUE_ERROR);
  }
}

function assertValidChildIndex(index: unknown, childCount: number): asserts index is number {
  if (!Number.isInteger(index) || index < 0 || index > childCount) {
    throw new Error(CHILD_INDEX_ERROR);
  }
}

function assertElementNode(
  node: BubbleNode,
  nodeId: BubbleNodeId,
  target: "Attributes" | "Properties",
): asserts node is BubbleElementNode {
  if (node.kind !== "element") {
    throw new Error(`${target} are only supported on element nodes: ${nodeId}`);
  }
}

function assertTextNode(node: BubbleNode, nodeId: BubbleNodeId): asserts node is BubbleTextNode {
  if (node.kind !== "text") {
    throw new Error(`Text content can only be updated on text nodes: ${nodeId}`);
  }
}

export function createBubble(): BubbleRuntime {
  const root: BubbleRootNode = {
    id: ROOT_NODE_ID,
    kind: "root",
    children: [],
  };

  let nodes = new Map<BubbleNodeId, BubbleNode>([[root.id, root]]);
  nextBubbleInstanceId += 1;
  const bubbleInstanceId = nextBubbleInstanceId;
  let nextNodeId = 0;
  let transactionDepth = 0;
  const listeners = new Set<BubbleRuntimeListener>();

  const allocateNodeId = (): BubbleNodeId => {
    nextNodeId += 1;

    return `${NODE_ID_PREFIX}${bubbleInstanceId}:${nextNodeId}`;
  };

  const cloneNode = (node: BubbleNode): BubbleNode => {
    if (node.kind === "root") {
      return {
        id: node.id,
        kind: node.kind,
        children: [...node.children],
      };
    }

    if (node.kind === "element") {
      return {
        id: node.id,
        kind: node.kind,
        tag: node.tag,
        namespace: node.namespace,
        parentId: node.parentId,
        children: [...node.children],
        attributes: { ...node.attributes },
        properties: { ...node.properties },
      };
    }

    return {
      id: node.id,
      kind: node.kind,
      parentId: node.parentId,
      value: node.value,
    };
  };

  const snapshotNode = (node: BubbleNode): Readonly<BubbleNode> => {
    if (node.kind === "root") {
      return Object.freeze({
        id: node.id,
        kind: node.kind,
        children: Object.freeze([...node.children]),
      });
    }

    if (node.kind === "element") {
      return Object.freeze({
        id: node.id,
        kind: node.kind,
        tag: node.tag,
        namespace: node.namespace,
        parentId: node.parentId,
        children: Object.freeze([...node.children]),
        attributes: Object.freeze({ ...node.attributes }),
        properties: Object.freeze({ ...node.properties }),
      });
    }

    return Object.freeze({
      id: node.id,
      kind: node.kind,
      parentId: node.parentId,
      value: node.value,
    });
  };

  const insertIntoParent = (
    parent: BubbleRootNode | BubbleElementNode,
    childId: BubbleNodeId,
    index: number = parent.children.length,
  ): void => {
    assertValidChildIndex(index, parent.children.length);
    parent.children.splice(index, 0, childId);
  };

  const removeFromParent = (
    parent: BubbleRootNode | BubbleElementNode,
    childId: BubbleNodeId,
  ): void => {
    const childIndex = parent.children.indexOf(childId);

    if (childIndex === -1) {
      throw new Error(`Node ${childId} is not a child of ${parent.id}`);
    }

    parent.children.splice(childIndex, 1);
  };

  const moveWithinParent = (
    parent: BubbleRootNode | BubbleElementNode,
    childId: BubbleNodeId,
    index: number,
  ): void => {
    const childIndex = parent.children.indexOf(childId);

    if (childIndex === -1) {
      throw new Error(`Node ${childId} is not a child of ${parent.id}`);
    }

    assertValidChildIndex(index, parent.children.length - 1);

    parent.children.splice(childIndex, 1);
    parent.children.splice(index, 0, childId);
  };

  return {
    rootId: root.id,
    transact<T>(fn: (tx: BubbleTransaction) => T): T {
      if (transactionDepth > 0) {
        throw new Error(NESTED_TRANSACTION_ERROR);
      }

      transactionDepth += 1;
      const draftNodes = new Map<BubbleNodeId, BubbleNode>();

      for (const [nodeId, node] of nodes) {
        draftNodes.set(nodeId, cloneNode(node));
      }

      const getDraftNode = (id: BubbleNodeId): BubbleNode => {
        const node = draftNodes.get(id);

        if (node === undefined) {
          throw new Error(`Unknown node ID: ${id}`);
        }

        return node;
      };

      const transaction: BubbleTransaction = {
        createElement({ tag, namespace = "html" }) {
          assertValidElementTag(tag);

          const id = allocateNodeId();

          draftNodes.set(id, {
            id,
            kind: "element",
            tag,
            namespace,
            parentId: null,
            children: [],
            attributes: {},
            properties: {},
          });

          return id;
        },
        createText({ value }) {
          assertValidTextValue(value);

          const id = allocateNodeId();

          draftNodes.set(id, {
            id,
            kind: "text",
            parentId: null,
            value,
          });

          return id;
        },
        setText({ nodeId, value }) {
          const node = getDraftNode(nodeId);

          assertValidTextValue(value);
          assertTextNode(node, nodeId);
          node.value = value;
        },
        insertChild({ parentId, childId, index }) {
          const parent = getDraftNode(parentId);
          const child = getDraftNode(childId);

          if (parent.kind === "text") {
            throw new Error(`Text nodes cannot have children: ${parentId}`);
          }

          if (child.kind === "root") {
            throw new Error("The root node cannot be inserted as a child");
          }

          child.parentId = parentId;
          insertIntoParent(parent, childId, index);
        },
        removeChild({ parentId, childId }) {
          const parent = getDraftNode(parentId);
          const child = getDraftNode(childId);

          if (parent.kind === "text") {
            throw new Error(`Text nodes cannot have children: ${parentId}`);
          }

          if (child.kind === "root") {
            throw new Error("The root node cannot be removed as a child");
          }

          removeFromParent(parent, childId);
          child.parentId = null;
        },
        moveChild({ parentId, childId, index }) {
          const parent = getDraftNode(parentId);
          const child = getDraftNode(childId);

          if (parent.kind === "text") {
            throw new Error(`Text nodes cannot have children: ${parentId}`);
          }

          if (child.kind === "root") {
            throw new Error("The root node cannot be moved as a child");
          }

          if (child.parentId !== parentId) {
            throw new Error(`Node ${childId} is not a child of ${parentId}`);
          }

          moveWithinParent(parent, childId, index);
        },
        setAttribute({ nodeId, name, value }) {
          const node = getDraftNode(nodeId);

          assertElementNode(node, nodeId, "Attributes");
          node.attributes[name] = value;
        },
        removeAttribute({ nodeId, name }) {
          const node = getDraftNode(nodeId);

          assertElementNode(node, nodeId, "Attributes");
          delete node.attributes[name];
        },
        setProperty({ nodeId, name, value }) {
          const node = getDraftNode(nodeId);

          assertElementNode(node, nodeId, "Properties");
          node.properties[name] = value;
        },
      };

      try {
        const result = fn(transaction);

        nodes = draftNodes;
        transactionDepth = 0;

        const event: BubbleRuntimeEvent = {
          type: "transaction-committed",
          record: { mutations: [] },
        };

        for (const listener of listeners) {
          listener(event);
        }

        return result;
      } catch (error) {
        transactionDepth = 0;
        throw error;
      }
    },
    getNode(id) {
      const node = nodes.get(id);

      return node === undefined ? null : snapshotNode(node);
    },
    getRoot() {
      return snapshotNode(nodes.get(root.id) as BubbleRootNode) as Readonly<BubbleRootNode>;
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
