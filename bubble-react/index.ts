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

const PROPERTY_DEFAULTS = {
  checked: false,
  disabled: false,
  tabIndex: null,
  value: "",
} satisfies Record<string, unknown>;

type BubbleReactPropertyName = keyof typeof PROPERTY_DEFAULTS;

interface BubbleReactTextNode {
  kind: "text";
  nodeId: BubbleNodeId;
  value: string;
}

interface BubbleReactElementNode {
  kind: "element";
  nodeId: BubbleNodeId;
  tag: string;
  attributes: Record<string, string>;
  properties: Partial<Record<BubbleReactPropertyName, unknown>>;
  children: BubbleReactNode[];
}

type BubbleReactNode = BubbleReactTextNode | BubbleReactElementNode;

interface BubbleReactTextPlan {
  kind: "text";
  value: string;
}

interface BubbleReactElementPlan {
  kind: "element";
  tag: string;
  attributes: Record<string, string>;
  properties: Partial<Record<BubbleReactPropertyName, unknown>>;
  children: BubbleReactPlan[];
}

type BubbleReactPlan = BubbleReactTextPlan | BubbleReactElementPlan;

function normalizeAttributeName(name: string): string {
  if (name === "className") {
    return "class";
  }

  if (name === "htmlFor") {
    return "for";
  }

  return name;
}

function isBubbleReactPropertyName(name: string): name is BubbleReactPropertyName {
  return name in PROPERTY_DEFAULTS;
}

function planReactProps(
  props: Record<string, unknown>,
): Pick<BubbleReactElementPlan, "attributes" | "properties"> {
  const attributes: Record<string, string> = {};
  const properties: Partial<Record<BubbleReactPropertyName, unknown>> = {};

  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || value === undefined || value === null || value === false) {
      continue;
    }

    if (typeof value === "function" && name.startsWith("on")) {
      // Event props are deferred to the dedicated event-handler slice.
    } else if (isBubbleReactPropertyName(name)) {
      properties[name] = name === "value" ? String(value) : value;
    } else {
      attributes[normalizeAttributeName(name)] = value === true ? "" : String(value);
    }
  }

  return { attributes, properties };
}

function planReactNode(node: ReactNode): readonly BubbleReactPlan[] {
  const plans: BubbleReactPlan[] = [];

  for (const child of Children.toArray(node)) {
    if (typeof child === "string" || typeof child === "number") {
      plans.push({
        kind: "text",
        value: String(child),
      });
      continue;
    }

    if (!isValidElement(child) || typeof child.type !== "string") {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR);
    }

    const props = child.props as Record<string, unknown>;
    const { attributes, properties } = planReactProps(props);

    plans.push({
      kind: "element",
      tag: child.type,
      attributes,
      properties,
      children: [...planReactNode(props.children as ReactNode)],
    });
  }

  return plans;
}

function canReuseNode(currentNode: BubbleReactNode, plan: BubbleReactPlan): boolean {
  return currentNode.kind === plan.kind && (plan.kind !== "element" || currentNode.tag === plan.tag);
}

function reconcileAttributes(
  currentNode: BubbleReactElementNode,
  plan: BubbleReactElementPlan,
  tx: BubbleTransaction,
): void {
  for (const [name, value] of Object.entries(plan.attributes)) {
    if (currentNode.attributes[name] !== value) {
      tx.setAttribute({ nodeId: currentNode.nodeId, name, value });
    }
  }

  for (const name of Object.keys(currentNode.attributes)) {
    if (!(name in plan.attributes)) {
      tx.removeAttribute({ nodeId: currentNode.nodeId, name });
    }
  }
}

function reconcileProperties(
  currentNode: BubbleReactElementNode,
  plan: BubbleReactElementPlan,
  tx: BubbleTransaction,
): void {
  for (const [name, value] of Object.entries(plan.properties) as [BubbleReactPropertyName, unknown][]) {
    if (!Object.is(currentNode.properties[name], value)) {
      tx.setProperty({ nodeId: currentNode.nodeId, name, value });
    }
  }

  for (const name of Object.keys(currentNode.properties) as BubbleReactPropertyName[]) {
    if (!(name in plan.properties)) {
      tx.setProperty({
        nodeId: currentNode.nodeId,
        name,
        value: PROPERTY_DEFAULTS[name],
      });
    }
  }
}

function createNode(plan: BubbleReactPlan, tx: BubbleTransaction): BubbleReactNode {
  if (plan.kind === "text") {
    return {
      kind: "text",
      nodeId: tx.createText({ value: plan.value }),
      value: plan.value,
    };
  }

  const nodeId = tx.createElement({ tag: plan.tag });

  for (const [name, value] of Object.entries(plan.attributes)) {
    tx.setAttribute({ nodeId, name, value });
  }

  for (const [name, value] of Object.entries(plan.properties) as [BubbleReactPropertyName, unknown][]) {
    tx.setProperty({ nodeId, name, value });
  }

  const children = reconcileChildren({
    parentId: nodeId,
    currentChildren: [],
    nextPlans: plan.children,
    tx,
  });

  return {
    kind: "element",
    nodeId,
    tag: plan.tag,
    attributes: { ...plan.attributes },
    properties: { ...plan.properties },
    children,
  };
}

function reconcileNode(
  currentNode: BubbleReactNode,
  plan: BubbleReactPlan,
  tx: BubbleTransaction,
): BubbleReactNode {
  if (currentNode.kind === "text" && plan.kind === "text") {
    if (currentNode.value !== plan.value) {
      tx.setText({ nodeId: currentNode.nodeId, value: plan.value });
    }

    return {
      kind: "text",
      nodeId: currentNode.nodeId,
      value: plan.value,
    };
  }

  reconcileAttributes(currentNode as BubbleReactElementNode, plan as BubbleReactElementPlan, tx);
  reconcileProperties(currentNode as BubbleReactElementNode, plan as BubbleReactElementPlan, tx);

  return {
    kind: "element",
    nodeId: currentNode.nodeId,
    tag: currentNode.tag,
    attributes: { ...(plan as BubbleReactElementPlan).attributes },
    properties: { ...(plan as BubbleReactElementPlan).properties },
    children: reconcileChildren({
      parentId: currentNode.nodeId,
      currentChildren: (currentNode as BubbleReactElementNode).children,
      nextPlans: (plan as BubbleReactElementPlan).children,
      tx,
    }),
  };
}

function reconcileChildren(input: {
  parentId: BubbleNodeId;
  currentChildren: readonly BubbleReactNode[];
  nextPlans: readonly BubbleReactPlan[];
  tx: BubbleTransaction;
}): BubbleReactNode[] {
  const nextChildren: BubbleReactNode[] = [];

  for (const [index, plan] of input.nextPlans.entries()) {
    const currentNode = input.currentChildren[index];

    if (currentNode === undefined) {
      const createdNode = createNode(plan, input.tx);
      input.tx.insertChild({ parentId: input.parentId, childId: createdNode.nodeId, index });
      nextChildren.push(createdNode);
      continue;
    }

    if (canReuseNode(currentNode, plan)) {
      nextChildren.push(reconcileNode(currentNode, plan, input.tx));
      continue;
    }

    input.tx.removeChild({ parentId: input.parentId, childId: currentNode.nodeId });
    const createdNode = createNode(plan, input.tx);
    input.tx.insertChild({ parentId: input.parentId, childId: createdNode.nodeId, index });
    nextChildren.push(createdNode);
  }

  for (let index = input.currentChildren.length - 1; index >= input.nextPlans.length; index -= 1) {
    input.tx.removeChild({
      parentId: input.parentId,
      childId: input.currentChildren[index]!.nodeId,
    });
  }

  return nextChildren;
}

export function createBubbleReactRoot(options: CreateBubbleReactRootOptions): BubbleReactRoot {
  let currentChildren: BubbleReactNode[] = [];

  const render = (node: ReactNode): void => {
    const nextPlans = planReactNode(node);
    let nextChildren: BubbleReactNode[] = [];

    options.bubble.transact((tx) => {
      nextChildren = reconcileChildren({
        parentId: options.bubble.rootId,
        currentChildren,
        nextPlans,
        tx,
      });
    });

    currentChildren = nextChildren;
  };

  return {
    render,
    unmount() {
      render(null);
    },
  };
}
