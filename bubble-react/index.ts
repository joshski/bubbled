import { Children, isValidElement, type ReactNode } from "react";

import type { BubbleNodeId, BubbleRuntime, BubbleTransaction } from "../bubble-core";

export interface BubbleReactRoot {
  render(node: ReactNode): void;
  unmount(): void;
}

export interface CreateBubbleReactRootOptions {
  bubble: BubbleRuntime;
}

const UNSUPPORTED_REACT_NODE_TYPE_ERROR =
  "bubble-react only supports host elements and text nodes in this slice";

function materializeReactNode(node: ReactNode, tx: BubbleTransaction): readonly BubbleNodeId[] {
  const nodeIds: BubbleNodeId[] = [];

  for (const child of Children.toArray(node)) {
    if (typeof child === "string" || typeof child === "number") {
      nodeIds.push(tx.createText({ value: String(child) }));
      continue;
    }

    if (!isValidElement(child) || typeof child.type !== "string") {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR);
    }

    const elementId = tx.createElement({ tag: child.type });
    const props = child.props as { children?: ReactNode };

    for (const childId of materializeReactNode(props.children, tx)) {
      tx.insertChild({ parentId: elementId, childId });
    }

    nodeIds.push(elementId);
  }

  return nodeIds;
}

export function createBubbleReactRoot(options: CreateBubbleReactRootOptions): BubbleReactRoot {
  const render = (node: ReactNode): void => {
    const existingChildIds = [...options.bubble.getRoot().children];

    options.bubble.transact((tx) => {
      for (const childId of existingChildIds) {
        tx.removeChild({ parentId: options.bubble.rootId, childId });
      }

      for (const childId of materializeReactNode(node, tx)) {
        tx.insertChild({ parentId: options.bubble.rootId, childId });
      }
    });
  };

  return {
    render,
    unmount() {
      render(null);
    },
  };
}
