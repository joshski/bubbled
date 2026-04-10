import type { BubbleNode, BubbleNodeId, BubbleRuntime } from "../bubble-core";

export interface BubbleDomProjector {
  mount(container: HTMLElement): void;
  unmount(): void;
}

export interface CreateDomProjectorOptions {
  bubble: BubbleRuntime;
  bridgeEvents?: boolean;
  syncFocus?: boolean;
}

interface DomChildNode {
  remove(): void;
}

interface DomTextNode extends DomChildNode {}

interface DomElementNode extends DomChildNode {
  appendChild(node: DomChildNode): DomChildNode;
  setAttribute(name: string, value: string): void;
}

interface DomDocument {
  createElement(tag: string): DomElementNode;
  createTextNode(value: string): DomTextNode;
}

interface DomContainer {
  ownerDocument: DomDocument;
  appendChild(node: DomChildNode): DomChildNode;
}

function projectNode(
  nodeId: BubbleNodeId,
  nodes: ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>,
  document: DomDocument,
): DomChildNode {
  const node = nodes.get(nodeId) as Readonly<BubbleNode>;

  if (node.kind === "text") {
    return document.createTextNode(node.value);
  }

  const element = document.createElement(node.tag);

  for (const [name, value] of Object.entries(node.attributes)) {
    element.setAttribute(name, value);
  }

  for (const childId of node.children) {
    element.appendChild(projectNode(childId, nodes, document));
  }

  return element;
}

export function createDomProjector(options: CreateDomProjectorOptions): BubbleDomProjector {
  let mountedContainer: DomContainer | null = null;
  let projectedNodes: DomChildNode[] = [];

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

      projectedNodes = root.children.map((childId) =>
        projectNode(childId, snapshot.nodes, domContainer.ownerDocument),
      );

      for (const projectedNode of projectedNodes) {
        domContainer.appendChild(projectedNode);
      }

      mountedContainer = domContainer;
    },
    unmount() {
      if (mountedContainer === null) {
        return;
      }

      for (const projectedNode of projectedNodes) {
        projectedNode.remove();
      }

      projectedNodes = [];
      mountedContainer = null;
    },
  });
}
