import type {
  BubbleMutation,
  BubbleNode,
  BubbleNodeId,
  BubbleRuntime,
  BubbleRuntimeEvent,
} from "../bubble-core";

export interface BubbleDomProjector {
  mount(container: HTMLElement): void;
  unmount(): void;
}

export interface CreateDomProjectorOptions {
  bubble: BubbleRuntime;
  bridgeEvents?: boolean;
  syncFocus?: boolean;
}

interface DomParentNode {
  appendChild(node: DomChildNode): DomChildNode;
  insertBefore(node: DomChildNode, referenceNode: DomChildNode | null): DomChildNode;
  removeChild(node: DomChildNode): DomChildNode;
}

interface DomChildNode {
  parentNode: DomParentNode | null;
  remove(): void;
}

interface DomTextNode extends DomChildNode {
  data: string;
}

interface DomElementNode extends DomChildNode, DomParentNode {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

interface DomDocument {
  createElement(tag: string): DomElementNode;
  createTextNode(value: string): DomTextNode;
}

interface DomContainer extends DomParentNode {
  ownerDocument: DomDocument;
}

function getBubbleNode(bubble: BubbleRuntime, nodeId: BubbleNodeId): Readonly<BubbleNode> {
  return bubble.getNode(nodeId) as Readonly<BubbleNode>;
}

export function createDomProjector(options: CreateDomProjectorOptions): BubbleDomProjector {
  let mountedContainer: DomContainer | null = null;
  let unsubscribe: (() => void) | null = null;
  const nodeLookup = new Map<BubbleNodeId, DomChildNode>();

  const ensureProjectedNode = (
    nodeId: BubbleNodeId,
    document: DomDocument,
  ): DomChildNode => {
    const existingNode = nodeLookup.get(nodeId);

    if (existingNode !== undefined) {
      return existingNode;
    }

    const node = getBubbleNode(options.bubble, nodeId);

    if (node.kind === "text") {
      const textNode = document.createTextNode(node.value);

      nodeLookup.set(nodeId, textNode);
      return textNode;
    }

    const element = document.createElement(node.tag);

    nodeLookup.set(nodeId, element);

    for (const [name, value] of Object.entries(node.attributes)) {
      element.setAttribute(name, value);
    }

    for (const childId of node.children) {
      element.appendChild(ensureProjectedNode(childId, document));
    }

    return element;
  };

  const getParentNode = (parentId: BubbleNodeId): DomContainer | DomElementNode => {
    if (parentId === options.bubble.rootId) {
      return mountedContainer as DomContainer;
    }

    return nodeLookup.get(parentId) as DomElementNode;
  };

  const findReferenceNode = (
    parentNode: DomContainer | DomElementNode,
    parentId: BubbleNodeId,
    index: number,
  ): DomChildNode | null => {
    const parent = getBubbleNode(options.bubble, parentId);

    for (const siblingId of parent.children.slice(index + 1)) {
      const siblingNode = nodeLookup.get(siblingId);

      if (siblingNode !== undefined && siblingNode.parentNode === parentNode) return siblingNode;
    }

    return null;
  };

  const insertChildAt = (parentId: BubbleNodeId, childId: BubbleNodeId, index: number): void => {
    const document = (mountedContainer as DomContainer).ownerDocument;
    const parentNode = getParentNode(parentId);
    const childNode = ensureProjectedNode(childId, document);
    const referenceNode = findReferenceNode(parentNode, parentId, index);

    parentNode.insertBefore(childNode, referenceNode);
  };

  const applyMutation = (mutation: BubbleMutation): void => {
    if (mutation.type === "node-created" || mutation.type === "property-set") {
      return;
    }

    switch (mutation.type) {
      case "child-inserted":
      case "child-moved":
        insertChildAt(mutation.parentId, mutation.childId, mutation.index);
        return;
      case "child-removed":
        nodeLookup.get(mutation.childId)?.remove();
        return;
      case "text-set":
        (ensureProjectedNode(
          mutation.nodeId,
          (mountedContainer as DomContainer).ownerDocument,
        ) as DomTextNode).data = mutation.value;
        return;
      case "attribute-set":
        (ensureProjectedNode(
          mutation.nodeId,
          (mountedContainer as DomContainer).ownerDocument,
        ) as DomElementNode).setAttribute(
          mutation.name,
          mutation.value,
        );
        return;
      case "attribute-removed":
        (ensureProjectedNode(
          mutation.nodeId,
          (mountedContainer as DomContainer).ownerDocument,
        ) as DomElementNode).removeAttribute(
          mutation.name,
        );
        return;
    }
  };

  const handleRuntimeEvent = (event: BubbleRuntimeEvent): void => {
    for (const mutation of event.record.mutations) {
      applyMutation(mutation);
    }
  };

  return Object.freeze({
    mount(container) {
      if (mountedContainer !== null) {
        throw new Error("Bubble DOM projector is already mounted.");
      }

      const domContainer = container as unknown as DomContainer;
      const snapshot = options.bubble.snapshot();
      const root = snapshot.nodes.get(snapshot.rootId) as Readonly<BubbleNode> & {
        readonly kind: "root";
        readonly children: readonly BubbleNodeId[];
      };

      for (const childId of root.children) {
        domContainer.appendChild(ensureProjectedNode(childId, domContainer.ownerDocument));
      }

      mountedContainer = domContainer;
      unsubscribe = options.bubble.subscribe(handleRuntimeEvent);
    },
    unmount() {
      if (mountedContainer === null) {
        return;
      }

      unsubscribe?.();
      unsubscribe = null;

      for (const childId of options.bubble.getRoot().children) {
        nodeLookup.get(childId)?.remove();
      }

      nodeLookup.clear();
      mountedContainer = null;
    },
  });
}
