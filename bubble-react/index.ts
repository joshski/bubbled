import {
  Children,
  isValidElement,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type {
  BubbleEvent,
  BubbleListenerHandle,
  BubbleNodeId,
  BubbleRuntime,
  BubbleTransaction,
} from "../bubble-core";
import {
  readReactClientInternals,
  type BubbleReactClientInternals,
  type BubbleReactHookDispatcher,
} from "./react-client-internals";

export interface BubbleReactRoot {
  render(node: ReactNode): void;
  unmount(): void;
}

export interface CreateBubbleReactRootOptions {
  bubble: BubbleRuntime;
}

const UNSUPPORTED_REACT_NODE_TYPE_ERROR =
  "bubble-react only supports host elements and text nodes in this slice";
const UNSUPPORTED_REACT_HOOK_ERROR =
  "bubble-react only supports useState in this slice";

const PROPERTY_DEFAULTS = {
  checked: false,
  disabled: false,
  tabIndex: null,
  value: "",
} satisfies Record<string, unknown>;

type BubbleReactPropertyName = keyof typeof PROPERTY_DEFAULTS;
type BubbleReactEventHandler = (event: BubbleEvent) => void;

const EVENT_TYPE_BY_HANDLER_NAME = {
  onClick: "click",
} as const;

type BubbleReactEventHandlerName = keyof typeof EVENT_TYPE_BY_HANDLER_NAME;

interface BubbleReactRegisteredEventHandler {
  handle: BubbleListenerHandle;
  listener: BubbleReactEventHandler;
}

interface BubbleReactTextNode {
  kind: "text";
  key: string | null;
  nodeId: BubbleNodeId;
  value: string;
}

interface BubbleReactElementNode {
  kind: "element";
  key: string | null;
  nodeId: BubbleNodeId;
  tag: string;
  attributes: Record<string, string>;
  properties: Partial<Record<BubbleReactPropertyName, unknown>>;
  eventHandlers: Partial<Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>>;
  children: BubbleReactNode[];
}

type BubbleReactNode = BubbleReactTextNode | BubbleReactElementNode;

interface BubbleReactTextPlan {
  kind: "text";
  key: string | null;
  value: string;
}

interface BubbleReactElementPlan {
  kind: "element";
  key: string | null;
  tag: string;
  attributes: Record<string, string>;
  properties: Partial<Record<BubbleReactPropertyName, unknown>>;
  eventHandlers: Partial<Record<BubbleReactEventHandlerName, BubbleReactEventHandler>>;
  children: BubbleReactPlan[];
}

type BubbleReactPlan = BubbleReactTextPlan | BubbleReactElementPlan;

interface BubbleReactHookState<TValue> {
  value: TValue;
  setValue: Dispatch<SetStateAction<TValue>>;
}

interface BubbleReactComponentState {
  hooks: unknown[];
}

interface BubbleReactPlanningContext {
  getComponentState(path: string): BubbleReactComponentState;
  getReactClientInternals(): BubbleReactClientInternals;
  markComponentAsUsed(path: string): void;
  scheduleRender(): void;
}

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

function isBubbleReactEventHandlerName(name: string): name is BubbleReactEventHandlerName {
  return name in EVENT_TYPE_BY_HANDLER_NAME;
}

function planReactProps(
  props: Record<string, unknown>,
): Pick<BubbleReactElementPlan, "attributes" | "properties" | "eventHandlers"> {
  const attributes: Record<string, string> = {};
  const properties: Partial<Record<BubbleReactPropertyName, unknown>> = {};
  const eventHandlers: Partial<Record<BubbleReactEventHandlerName, BubbleReactEventHandler>> = {};

  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || value === undefined || value === null || value === false) {
      continue;
    }

    if (typeof value === "function" && isBubbleReactEventHandlerName(name)) {
      eventHandlers[name] = value as BubbleReactEventHandler;
    } else if (isBubbleReactPropertyName(name)) {
      properties[name] = name === "value" ? String(value) : value;
    } else {
      attributes[normalizeAttributeName(name)] = value === true ? "" : String(value);
    }
  }

  return { attributes, properties, eventHandlers };
}

function createUnsupportedHook(): () => never {
  return () => {
    throw new Error(UNSUPPORTED_REACT_HOOK_ERROR);
  };
}

function planFunctionComponent(
  componentPath: string,
  component: (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>,
  props: Record<string, unknown>,
  context: BubbleReactPlanningContext,
): readonly BubbleReactPlan[] {
  const componentState = context.getComponentState(componentPath);
  let hookIndex = 0;

  const dispatcher: BubbleReactHookDispatcher & Record<string, unknown> = {
    useState<TValue>(
      initialState: TValue | (() => TValue),
    ): [TValue, Dispatch<SetStateAction<TValue>>] {
      const existingState = componentState.hooks[hookIndex] as BubbleReactHookState<TValue> | undefined;

      if (existingState !== undefined) {
        hookIndex += 1;
        return [existingState.value, existingState.setValue];
      }

      const stateIndex = hookIndex;
      const initialValue =
        typeof initialState === "function" ? (initialState as () => TValue)() : initialState;
      const hookState: BubbleReactHookState<TValue> = {
        value: initialValue,
        setValue(nextValue) {
          const resolvedValue =
            typeof nextValue === "function"
              ? (nextValue as (value: TValue) => TValue)(hookState.value)
              : nextValue;

          if (Object.is(hookState.value, resolvedValue)) {
            return;
          }

          hookState.value = resolvedValue;
          context.scheduleRender();
        },
      };

      componentState.hooks[stateIndex] = hookState;
      hookIndex += 1;
      return [hookState.value, hookState.setValue];
    },
    useCallback: createUnsupportedHook(),
    useContext: createUnsupportedHook(),
    useDebugValue: createUnsupportedHook(),
    useDeferredValue: createUnsupportedHook(),
    useEffect: createUnsupportedHook(),
    useId: createUnsupportedHook(),
    useImperativeHandle: createUnsupportedHook(),
    useInsertionEffect: createUnsupportedHook(),
    useLayoutEffect: createUnsupportedHook(),
    useMemo: createUnsupportedHook(),
    useOptimistic: createUnsupportedHook(),
    useReducer: createUnsupportedHook(),
    useRef: createUnsupportedHook(),
    useSyncExternalStore: createUnsupportedHook(),
    useTransition: createUnsupportedHook(),
  };
  const reactClientInternals = context.getReactClientInternals();
  const previousDispatcher = reactClientInternals.H;

  reactClientInternals.H = dispatcher;

  try {
    context.markComponentAsUsed(componentPath);
    const renderedNode = component(props);

    if (renderedNode instanceof Promise) {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR);
    }

    return planReactNode(renderedNode, context, componentPath);
  } finally {
    reactClientInternals.H = previousDispatcher;
  }
}

function planReactNode(
  node: ReactNode,
  context: BubbleReactPlanningContext,
  parentPath = "root",
): readonly BubbleReactPlan[] {
  const plans: BubbleReactPlan[] = [];
  let index = 0;

  Children.forEach(node, (child) => {
    const childPath = `${parentPath}.${index}`;
    index += 1;

    if (typeof child === "string" || typeof child === "number") {
      plans.push({
        kind: "text",
        key: null,
        value: String(child),
      });
      return;
    }

    if (!isValidElement(child)) {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR);
    }

    const props = child.props as Record<string, unknown>;
    const key = child.key === null ? null : String(child.key);

    if (typeof child.type === "function") {
      plans.push(
        ...planFunctionComponent(
          childPath,
          child.type as (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>,
          props,
          context,
        ),
      );
      return;
    }

    if (typeof child.type !== "string") {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR);
    }

    const { attributes, properties, eventHandlers } = planReactProps(props);

    plans.push({
      kind: "element",
      key,
      tag: child.type,
      attributes,
      properties,
      eventHandlers,
      children: [...planReactNode(props.children as ReactNode, context, childPath)],
    });
  });

  return plans;
}

function canReuseNode(currentNode: BubbleReactNode, plan: BubbleReactPlan): boolean {
  return (
    currentNode.key === plan.key &&
    currentNode.kind === plan.kind &&
    (plan.kind === "text" || (currentNode.kind === "element" && currentNode.tag === plan.tag))
  );
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

function reconcileEventHandlers(
  currentNode: BubbleReactElementNode,
  plan: BubbleReactElementPlan,
  tx: BubbleTransaction,
): Partial<Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>> {
  const nextEventHandlers: Partial<
    Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>
  > = {};

  for (const name of Object.keys(currentNode.eventHandlers) as BubbleReactEventHandlerName[]) {
    const currentHandler = currentNode.eventHandlers[name] as BubbleReactRegisteredEventHandler;
    const nextListener = plan.eventHandlers[name];

    if (nextListener !== currentHandler.listener) {
      tx.removeEventListener(currentHandler.handle);
    }
  }

  for (const name of Object.keys(plan.eventHandlers) as BubbleReactEventHandlerName[]) {
    const nextListener = plan.eventHandlers[name] as BubbleReactEventHandler;
    const currentHandler = currentNode.eventHandlers[name];

    if (currentHandler !== undefined && currentHandler.listener === nextListener) {
      nextEventHandlers[name] = currentHandler;
      continue;
    }

    nextEventHandlers[name] = {
      handle: tx.addEventListener({
        nodeId: currentNode.nodeId,
        type: EVENT_TYPE_BY_HANDLER_NAME[name],
        listener: nextListener,
      }),
      listener: nextListener,
    };
  }

  return nextEventHandlers;
}

function removeEventHandlersFromSubtree(node: BubbleReactNode, tx: BubbleTransaction): void {
  if (node.kind === "text") {
    return;
  }

  for (const registration of Object.values(node.eventHandlers)) {
    if (registration !== undefined) {
      tx.removeEventListener(registration.handle);
    }
  }

  for (const child of node.children) {
    removeEventHandlersFromSubtree(child, tx);
  }
}

function createNode(plan: BubbleReactPlan, tx: BubbleTransaction): BubbleReactNode {
  if (plan.kind === "text") {
    return {
      kind: "text",
      key: plan.key,
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

  const eventHandlers = Object.fromEntries(
    (Object.keys(plan.eventHandlers) as BubbleReactEventHandlerName[]).map((name) => [
      name,
      {
        handle: tx.addEventListener({
          nodeId,
          type: EVENT_TYPE_BY_HANDLER_NAME[name],
          listener: plan.eventHandlers[name] as BubbleReactEventHandler,
        }),
        listener: plan.eventHandlers[name] as BubbleReactEventHandler,
      },
    ]),
  ) as Partial<Record<BubbleReactEventHandlerName, BubbleReactRegisteredEventHandler>>;

  const children = reconcileChildren({
    parentId: nodeId,
    currentChildren: [],
    nextPlans: plan.children,
    tx,
  });

  return {
    kind: "element",
    key: plan.key,
    nodeId,
    tag: plan.tag,
    attributes: { ...plan.attributes },
    properties: { ...plan.properties },
    eventHandlers,
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
      key: plan.key,
      nodeId: currentNode.nodeId,
      value: plan.value,
    };
  }

  const currentElementNode = currentNode as BubbleReactElementNode;
  const elementPlan = plan as BubbleReactElementPlan;

  reconcileAttributes(currentElementNode, elementPlan, tx);
  reconcileProperties(currentElementNode, elementPlan, tx);
  const eventHandlers = reconcileEventHandlers(currentElementNode, elementPlan, tx);

  return {
    kind: "element",
    key: elementPlan.key,
    nodeId: currentElementNode.nodeId,
    tag: currentElementNode.tag,
    attributes: { ...elementPlan.attributes },
    properties: { ...elementPlan.properties },
    eventHandlers,
    children: reconcileChildren({
      parentId: currentElementNode.nodeId,
      currentChildren: currentElementNode.children,
      nextPlans: elementPlan.children,
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
  const hasKeyedChildren =
    input.currentChildren.some((child) => child.key !== null) ||
    input.nextPlans.some((plan) => plan.key !== null);

  if (!hasKeyedChildren) {
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

      removeEventHandlersFromSubtree(currentNode, input.tx);
      input.tx.removeChild({ parentId: input.parentId, childId: currentNode.nodeId });
      const createdNode = createNode(plan, input.tx);
      input.tx.insertChild({ parentId: input.parentId, childId: createdNode.nodeId, index });
      nextChildren.push(createdNode);
    }

    for (let index = input.currentChildren.length - 1; index >= input.nextPlans.length; index -= 1) {
      removeEventHandlersFromSubtree(input.currentChildren[index] as BubbleReactNode, input.tx);
      input.tx.removeChild({
        parentId: input.parentId,
        childId: input.currentChildren[index]!.nodeId,
      });
    }

    return nextChildren;
  }

  const nextChildren: BubbleReactNode[] = [];
  const workingChildren = [...input.currentChildren];
  const currentChildrenByKey = new Map<string, BubbleReactNode>();
  const unmatchedUnkeyedChildren = input.currentChildren.filter((child) => child.key === null);
  const reusedNodeIds = new Set<BubbleNodeId>();

  for (const child of input.currentChildren) {
    if (child.key !== null) {
      currentChildrenByKey.set(child.key, child);
    }
  }

  for (const [index, plan] of input.nextPlans.entries()) {
    let currentNode: BubbleReactNode | undefined;

    if (plan.key !== null) {
      currentNode = currentChildrenByKey.get(plan.key);
    } else {
      currentNode = unmatchedUnkeyedChildren.shift();
    }

    if (currentNode !== undefined && canReuseNode(currentNode, plan)) {
      const nextNode = reconcileNode(currentNode, plan, input.tx);
      const currentIndex = workingChildren.findIndex((child) => child.nodeId === currentNode.nodeId);

      if (currentIndex !== index) {
        input.tx.moveChild({
          parentId: input.parentId,
          childId: currentNode.nodeId,
          index,
        });
        const [movedNode] = workingChildren.splice(currentIndex, 1);
        workingChildren.splice(index, 0, movedNode as BubbleReactNode);
      }

      reusedNodeIds.add(currentNode.nodeId);
      nextChildren.push(nextNode);
      continue;
    }

    const createdNode = createNode(plan, input.tx);
    input.tx.insertChild({ parentId: input.parentId, childId: createdNode.nodeId, index });
    workingChildren.splice(index, 0, createdNode);
    nextChildren.push(createdNode);
  }

  for (const child of input.currentChildren) {
    if (reusedNodeIds.has(child.nodeId)) {
      continue;
    }

    removeEventHandlersFromSubtree(child, input.tx);
    input.tx.removeChild({
      parentId: input.parentId,
      childId: child.nodeId,
    });
  }

  return nextChildren;
}

export function createBubbleReactRoot(options: CreateBubbleReactRootOptions): BubbleReactRoot {
  let currentChildren: BubbleReactNode[] = [];
  let currentNode: ReactNode = null;
  const componentStateByPath = new Map<string, BubbleReactComponentState>();
  let isRendering = false;
  let rerenderRequested = false;

  const getComponentState = (path: string): BubbleReactComponentState => {
    const existingState = componentStateByPath.get(path);

    if (existingState !== undefined) {
      return existingState;
    }

    const nextState: BubbleReactComponentState = {
      hooks: [],
    };

    componentStateByPath.set(path, nextState);
    return nextState;
  };

  const scheduleRender = (): void => {
    rerenderRequested = true;

    if (!isRendering) {
      renderCurrentNode();
    }
  };

  const renderCurrentNode = (): void => {
    if (isRendering) {
      rerenderRequested = true;
      return;
    }

    isRendering = true;

    try {
      do {
        rerenderRequested = false;
        const usedComponentPaths = new Set<string>();
        const nextPlans = planReactNode(currentNode, {
          getComponentState,
          getReactClientInternals: readReactClientInternals,
          markComponentAsUsed(path) {
            usedComponentPaths.add(path);
          },
          scheduleRender,
        });
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

        for (const path of componentStateByPath.keys()) {
          if (!usedComponentPaths.has(path)) {
            componentStateByPath.delete(path);
          }
        }
      } while (rerenderRequested);
    } finally {
      isRendering = false;
    }
  };

  const render = (node: ReactNode): void => {
    currentNode = node;
    renderCurrentNode();
  };

  return { render, unmount: () => render(null) }; }
