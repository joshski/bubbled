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
  insertChild(input: {
    parentId: BubbleNodeId;
    childId: BubbleNodeId;
    index?: number;
  }): void;
  removeChild(input: {
    parentId: BubbleNodeId;
    childId: BubbleNodeId;
  }): void;
}

export interface BubbleRuntime {
  readonly rootId: BubbleNodeId;
  transact<T>(fn: (tx: BubbleTransaction) => T): T;
  getNode(id: BubbleNodeId): Readonly<BubbleNode> | null;
  getRoot(): Readonly<BubbleRootNode>;
}

const ROOT_NODE_ID = "root";
const NODE_ID_PREFIX = "node:";

export function createBubble(): BubbleRuntime {
  const root: BubbleRootNode = {
    id: ROOT_NODE_ID,
    kind: "root",
    children: [],
  };

  const nodes = new Map<BubbleNodeId, BubbleNode>([[root.id, root]]);
  let nextNodeId = 0;

  const allocateNodeId = (): BubbleNodeId => {
    nextNodeId += 1;

    return `${NODE_ID_PREFIX}${nextNodeId}`;
  };

  const getMutableNode = (id: BubbleNodeId): BubbleNode => {
    const node = nodes.get(id);

    if (node === undefined) {
      throw new Error(`Unknown node ID: ${id}`);
    }

    return node;
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

  return {
    rootId: root.id,
    transact<T>(fn: (tx: BubbleTransaction) => T): T {
      const transaction: BubbleTransaction = {
        createElement({ tag, namespace = "html" }) {
          const id = allocateNodeId();

          nodes.set(id, {
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
          const id = allocateNodeId();

          nodes.set(id, {
            id,
            kind: "text",
            parentId: null,
            value,
          });

          return id;
        },
        insertChild({ parentId, childId, index }) {
          const parent = getMutableNode(parentId);
          const child = getMutableNode(childId);

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
          const parent = getMutableNode(parentId);
          const child = getMutableNode(childId);

          if (parent.kind === "text") {
            throw new Error(`Text nodes cannot have children: ${parentId}`);
          }

          if (child.kind === "root") {
            throw new Error("The root node cannot be removed as a child");
          }

          removeFromParent(parent, childId);
          child.parentId = null;
        },
      };

      return fn(transaction);
    },
    getNode(id) {
      const node = nodes.get(id);

      return node === undefined ? null : snapshotNode(node);
    },
    getRoot() {
      return snapshotNode(root) as Readonly<BubbleRootNode>;
    },
  };
}
