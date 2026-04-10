export type BubbleNodeId = string;

export interface BubbleRootNode {
  id: BubbleNodeId;
  kind: "root";
  children: BubbleNodeId[];
}

export interface BubbleRuntime {
  readonly rootId: BubbleNodeId;
  getNode(id: BubbleNodeId): Readonly<BubbleRootNode> | null;
  getRoot(): Readonly<BubbleRootNode>;
}

const ROOT_NODE_ID = "root";

export function createBubble(): BubbleRuntime {
  const root: BubbleRootNode = {
    id: ROOT_NODE_ID,
    kind: "root",
    children: [],
  };

  const snapshotRoot = (): Readonly<BubbleRootNode> =>
    Object.freeze({
      id: root.id,
      kind: root.kind,
      children: Object.freeze([...root.children]),
    });

  return {
    rootId: root.id,
    getNode(id) {
      return id === root.id ? snapshotRoot() : null;
    },
    getRoot() {
      return snapshotRoot();
    },
  };
}
