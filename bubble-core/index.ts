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

export type BubbleMutation =
  | { type: "node-created"; nodeId: BubbleNodeId; kind: "element" | "text" }
  | { type: "child-inserted"; parentId: BubbleNodeId; childId: BubbleNodeId; index: number }
  | { type: "child-removed"; parentId: BubbleNodeId; childId: BubbleNodeId; index: number }
  | { type: "child-moved"; parentId: BubbleNodeId; childId: BubbleNodeId; index: number }
  | { type: "attribute-set"; nodeId: BubbleNodeId; name: string; value: string }
  | { type: "attribute-removed"; nodeId: BubbleNodeId; name: string }
  | { type: "property-set"; nodeId: BubbleNodeId; name: string; value: unknown }
  | { type: "text-set"; nodeId: BubbleNodeId; value: string };

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
  addEventListener(input: {
    nodeId: BubbleNodeId;
    type: string;
    listener: BubbleEventListener;
    capture?: boolean;
  }): BubbleListenerHandle;
  removeEventListener(handle: BubbleListenerHandle): void;
}

export interface BubbleTransactionRecord {
  sequence: number;
  mutations: readonly BubbleMutation[];
}

export type BubbleRuntimeEvent = {
  type: "transaction-committed";
  record: BubbleTransactionRecord;
};

export type BubbleRuntimeListener = (event: BubbleRuntimeEvent) => void;

export interface BubbleDispatchInput {
  type: string;
  targetId: BubbleNodeId;
  data?: Record<string, unknown>;
  cancelable?: boolean;
}

export interface BubbleEvent {
  readonly type: string;
  readonly targetId: BubbleNodeId;
  readonly currentTargetId: BubbleNodeId;
  readonly phase: "capture" | "target" | "bubble";
  readonly cancelable: boolean;
  readonly defaultPrevented: boolean;
  readonly data: Readonly<Record<string, unknown>>;
  preventDefault(): void;
  stopPropagation(): void;
}

export type BubbleEventListener = (event: BubbleEvent) => void;

export interface BubbleDispatchResult {
  readonly defaultPrevented: boolean;
  readonly delivered: boolean;
}

export interface BubbleListenerHandle {
  readonly nodeId: BubbleNodeId;
  readonly type: string;
  readonly capture: boolean;
  readonly internalId: string;
}

interface BubbleRegisteredListener {
  handle: BubbleListenerHandle;
  listener: BubbleEventListener;
}

type BubbleEventPhase = BubbleEvent["phase"];
type BubbleEventDispatchMode = "propagating" | "target-only";

export interface BubbleSnapshot {
  readonly rootId: BubbleNodeId;
  readonly nodes: ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>;
  readonly query: BubbleQueryApi;
}

export interface BubbleQueryApi {
  getById(id: BubbleNodeId): Readonly<BubbleNode> | null;
  getByTag(tag: string): ReadonlyArray<Readonly<BubbleElementNode>>;
}

export interface BubbleRuntime {
  readonly rootId: BubbleNodeId;
  transact<T>(fn: (tx: BubbleTransaction) => T): T;
  getNode(id: BubbleNodeId): Readonly<BubbleNode> | null;
  getRoot(): Readonly<BubbleRootNode>;
  snapshot(): BubbleSnapshot;
  dispatchEvent(input: BubbleDispatchInput): BubbleDispatchResult;
  focus(id: BubbleNodeId): void;
  blur(): void;
  getFocusedNodeId(): BubbleNodeId | null;
  getTabOrder(): readonly BubbleNodeId[];
  subscribe(listener: BubbleRuntimeListener): () => void;
}

export function createBubbleQuery(snapshot: Pick<BubbleSnapshot, "nodes">): BubbleQueryApi {
  return Object.freeze({
    getById(id) {
      return snapshot.nodes.get(id) ?? null;
    },
    getByTag(tag) {
      const matchingNodes: Readonly<BubbleElementNode>[] = [];

      for (const node of snapshot.nodes.values()) {
        if (node.kind === "element" && node.tag === tag) {
          matchingNodes.push(node);
        }
      }

      return Object.freeze(matchingNodes);
    },
  });
}

const ROOT_NODE_ID = "root";
const NODE_ID_PREFIX = "node:";

const ELEMENT_TAG_ERROR = "Element tag must be a non-empty string";
const TEXT_VALUE_ERROR = "Text value must be a string";
const EVENT_TYPE_ERROR = "Event type must be a non-empty string";
const CHILD_INDEX_ERROR = "Child index must be an integer within the parent child range";
const NESTED_TRANSACTION_ERROR = "Nested transactions are not supported";
const FOCUSABLE_HTML_TAGS = new Set(["button", "input", "select", "textarea"]);

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

function assertValidEventType(type: unknown): asserts type is string {
  if (typeof type !== "string" || type.trim().length === 0) {
    throw new Error(EVENT_TYPE_ERROR);
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

function assertEventTargetNode(
  node: BubbleNode,
  nodeId: BubbleNodeId,
): asserts node is BubbleElementNode {
  if (node.kind !== "element") {
    throw new Error(`Event listeners are only supported on element nodes: ${nodeId}`);
  }
}

function assertFocusableNode(node: BubbleNode, nodeId: BubbleNodeId): asserts node is BubbleElementNode {
  if (node.kind !== "element") {
    throw new Error(`Only element nodes can receive focus: ${nodeId}`);
  }

  if (node.namespace !== "html" || !FOCUSABLE_HTML_TAGS.has(node.tag)) {
    throw new Error(`Node is not focusable: ${nodeId}`);
  }
}

function getTabIndexValue(node: BubbleElementNode): number | null {
  const propertyValue = node.properties.tabIndex;

  if (typeof propertyValue === "number" && Number.isInteger(propertyValue)) {
    return propertyValue;
  }

  const attributeValue = node.attributes.tabindex;

  if (attributeValue === undefined) {
    return null;
  }

  const parsedValue = Number.parseInt(attributeValue, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function isDisabledElement(node: BubbleElementNode): boolean {
  return node.attributes.disabled !== undefined || node.properties.disabled === true;
}

function isTabbableElement(node: BubbleElementNode): boolean {
  if (node.namespace !== "html" || !FOCUSABLE_HTML_TAGS.has(node.tag) || isDisabledElement(node)) {
    return false;
  }

  const tabIndex = getTabIndexValue(node);

  return tabIndex === null || tabIndex >= 0;
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
  let nextTransactionSequence = 0;
  let nextListenerId = 0;
  let transactionDepth = 0;
  let focusedNodeId: BubbleNodeId | null = null;
  const listeners = new Set<BubbleRuntimeListener>();
  let eventListeners = new Map<BubbleNodeId, Map<string, BubbleRegisteredListener[]>>();

  const allocateNodeId = (): BubbleNodeId => {
    nextNodeId += 1;

    return `${NODE_ID_PREFIX}${bubbleInstanceId}:${nextNodeId}`;
  };

  const allocateListenerId = (): string => {
    nextListenerId += 1;

    return `listener:${bubbleInstanceId}:${nextListenerId}`;
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

  const createSnapshot = (): BubbleSnapshot => {
    const snapshotNodes = new Map<BubbleNodeId, Readonly<BubbleNode>>();

    for (const [nodeId, node] of nodes) {
      snapshotNodes.set(nodeId, snapshotNode(node));
    }

    const snapshotBase = {
      rootId: root.id,
      nodes: snapshotNodes as ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>,
    };

    return Object.freeze({
      ...snapshotBase,
      query: createBubbleQuery(snapshotBase),
    });
  };

  const cloneEventListeners = (
    source: Map<BubbleNodeId, Map<string, BubbleRegisteredListener[]>>,
  ): Map<BubbleNodeId, Map<string, BubbleRegisteredListener[]>> => {
    const clonedListeners = new Map<BubbleNodeId, Map<string, BubbleRegisteredListener[]>>();

    for (const [nodeId, nodeListeners] of source) {
      const clonedNodeListeners = new Map<string, BubbleRegisteredListener[]>();

      for (const [eventType, registrations] of nodeListeners) {
        clonedNodeListeners.set(
          eventType,
          registrations.map((registration) => ({ ...registration })),
        );
      }

      clonedListeners.set(nodeId, clonedNodeListeners);
    }

    return clonedListeners;
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
  ): number => {
    const childIndex = parent.children.indexOf(childId);

    if (childIndex === -1) {
      throw new Error(`Node ${childId} is not a child of ${parent.id}`);
    }

    parent.children.splice(childIndex, 1);

    return childIndex;
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

  const getNodeListeners = (
    listenerMap: Map<BubbleNodeId, Map<string, BubbleRegisteredListener[]>>,
    nodeId: BubbleNodeId,
  ): Map<string, BubbleRegisteredListener[]> => {
    const nodeListeners = listenerMap.get(nodeId);

    if (nodeListeners !== undefined) {
      return nodeListeners;
    }

    const createdNodeListeners = new Map<string, BubbleRegisteredListener[]>();
    listenerMap.set(nodeId, createdNodeListeners);

    return createdNodeListeners;
  };

  const getEventPath = (targetId: BubbleNodeId): BubbleNodeId[] => {
    const path: BubbleNodeId[] = [];
    let currentId: BubbleNodeId | null = targetId;

    while (currentId !== null) {
      const node = nodes.get(currentId) as BubbleNode;

      if (node.kind === "element") {
        path.push(node.id);
      }

      currentId = node.kind === "root" ? null : node.parentId;
    }

    return path;
  };

  const dispatchEventToTarget = ({
    type,
    targetId,
    data = {},
    cancelable = false,
    mode = "propagating",
  }: BubbleDispatchInput & { mode?: BubbleEventDispatchMode }): BubbleDispatchResult => {
    assertValidEventType(type);
    const target = nodes.get(targetId);

    if (target === undefined) {
      throw new Error(`Unknown node ID: ${targetId}`);
    }

    if (target.kind !== "element") {
      return { defaultPrevented: false, delivered: false };
    }

    const targetQueue = (eventListeners.get(targetId)?.get(type) ?? []).slice();
    const deliveryQueue =
      mode === "target-only"
        ? targetQueue.map((registration) => ({
            nodeId: registration.handle.nodeId,
            phase: "target" as BubbleEventPhase,
            registration,
          }))
        : (() => {
            const path = getEventPath(targetId);
            const ancestorPath = path.slice(1);
            const captureQueue = ancestorPath
              .slice()
              .reverse()
              .flatMap((nodeId) =>
                (eventListeners.get(nodeId)?.get(type) ?? []).filter(
                  (registration) => registration.handle.capture,
                ),
              );
            const bubbleQueue = ancestorPath.flatMap((nodeId) =>
              (eventListeners.get(nodeId)?.get(type) ?? []).filter(
                (registration) => !registration.handle.capture,
              ),
            );

            return [
              ...captureQueue.map((registration) => ({
                nodeId: registration.handle.nodeId,
                phase: "capture" as BubbleEventPhase,
                registration,
              })),
              ...targetQueue.map((registration) => ({
                nodeId: registration.handle.nodeId,
                phase: "target" as BubbleEventPhase,
                registration,
              })),
              ...bubbleQueue.map((registration) => ({
                nodeId: registration.handle.nodeId,
                phase: "bubble" as BubbleEventPhase,
                registration,
              })),
            ];
          })();

    if (deliveryQueue.length === 0) {
      return { defaultPrevented: false, delivered: false };
    }

    const eventData = Object.freeze({ ...data });
    let currentTargetId = targetId;
    let phase: BubbleEventPhase = "target";
    let defaultPrevented = false;
    let propagationStopped = false;
    let propagationStopNodeId: BubbleNodeId | null = null;

    const event: BubbleEvent = {
      type,
      targetId,
      get currentTargetId() {
        return currentTargetId;
      },
      get phase() {
        return phase;
      },
      cancelable,
      get defaultPrevented() {
        return defaultPrevented;
      },
      data: eventData,
      preventDefault() {
        if (cancelable) {
          defaultPrevented = true;
        }
      },
      stopPropagation() {
        propagationStopped = true;
        propagationStopNodeId = currentTargetId;
      },
    };

    for (const queuedListener of deliveryQueue) {
      if (
        propagationStopped &&
        propagationStopNodeId !== null &&
        queuedListener.nodeId !== propagationStopNodeId
      ) {
        break;
      }

      currentTargetId = queuedListener.nodeId;
      phase = queuedListener.phase;
      queuedListener.registration.listener(event);
    }

    return { defaultPrevented, delivered: true };
  };

  const getTabOrder = (): readonly BubbleNodeId[] => {
    const visitedElementIds: BubbleNodeId[] = [];

    const visitNode = (nodeId: BubbleNodeId): void => {
      const node = nodes.get(nodeId) as BubbleNode;

      if (node.kind === "element") {
        visitedElementIds.push(nodeId);
      }

      if (node.kind === "text") {
        return;
      }

      for (const childId of node.children) {
        visitNode(childId);
      }
    };

    visitNode(root.id);

    const tabbableEntries = visitedElementIds
      .map((nodeId, domIndex) => {
        const node = nodes.get(nodeId) as BubbleElementNode;

        if (!isTabbableElement(node)) {
          return null;
        }

        return {
          nodeId,
          domIndex,
          tabIndex: getTabIndexValue(node) ?? 0,
        };
      })
      .filter((entry): entry is { nodeId: BubbleNodeId; domIndex: number; tabIndex: number } => entry !== null);

    const positiveTabIndexEntries = tabbableEntries
      .filter((entry) => entry.tabIndex > 0)
      .sort((left, right) => left.tabIndex - right.tabIndex || left.domIndex - right.domIndex);
    const naturalTabIndexEntries = tabbableEntries.filter((entry) => entry.tabIndex === 0);

    return Object.freeze([
      ...positiveTabIndexEntries.map((entry) => entry.nodeId),
      ...naturalTabIndexEntries.map((entry) => entry.nodeId),
    ]);
  };

  return {
    rootId: root.id,
    transact<T>(fn: (tx: BubbleTransaction) => T): T {
      if (transactionDepth > 0) {
        throw new Error(NESTED_TRANSACTION_ERROR);
      }

      transactionDepth += 1;
      const draftNodes = new Map<BubbleNodeId, BubbleNode>();
      const draftEventListeners = cloneEventListeners(eventListeners);

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

      const mutations: BubbleMutation[] = [];

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
          mutations.push({ type: "node-created", nodeId: id, kind: "element" });

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
          mutations.push({ type: "node-created", nodeId: id, kind: "text" });

          return id;
        },
        setText({ nodeId, value }) {
          const node = getDraftNode(nodeId);

          assertValidTextValue(value);
          assertTextNode(node, nodeId);
          node.value = value;
          mutations.push({ type: "text-set", nodeId, value });
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
          const insertionIndex = index ?? parent.children.length;

          insertIntoParent(parent, childId, insertionIndex);
          mutations.push({
            type: "child-inserted",
            parentId,
            childId,
            index: insertionIndex,
          });
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

          const removedIndex = removeFromParent(parent, childId);
          child.parentId = null;
          mutations.push({
            type: "child-removed",
            parentId,
            childId,
            index: removedIndex,
          });
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
          mutations.push({ type: "child-moved", parentId, childId, index });
        },
        setAttribute({ nodeId, name, value }) {
          const node = getDraftNode(nodeId);

          assertElementNode(node, nodeId, "Attributes");
          node.attributes[name] = value;
          mutations.push({ type: "attribute-set", nodeId, name, value });
        },
        removeAttribute({ nodeId, name }) {
          const node = getDraftNode(nodeId);

          assertElementNode(node, nodeId, "Attributes");
          delete node.attributes[name];
          mutations.push({ type: "attribute-removed", nodeId, name });
        },
        setProperty({ nodeId, name, value }) {
          const node = getDraftNode(nodeId);

          assertElementNode(node, nodeId, "Properties");
          node.properties[name] = value;
          mutations.push({ type: "property-set", nodeId, name, value });
        },
        addEventListener({ nodeId, type, listener, capture = false }) {
          const node = getDraftNode(nodeId);

          assertEventTargetNode(node, nodeId);
          assertValidEventType(type);

          const handle: BubbleListenerHandle = {
            nodeId,
            type,
            capture,
            internalId: allocateListenerId(),
          };
          const nodeListeners = getNodeListeners(draftEventListeners, nodeId);
          const registrations = nodeListeners.get(type) ?? [];

          registrations.push({ handle, listener });
          nodeListeners.set(type, registrations);

          return handle;
        },
        removeEventListener(handle) {
          const nodeListeners = draftEventListeners.get(handle.nodeId);
          const registrations = nodeListeners?.get(handle.type);

          if (registrations === undefined) {
            return;
          }

          const nextRegistrations = registrations.filter(
            (registration) => registration.handle.internalId !== handle.internalId,
          );

          if (nextRegistrations.length === registrations.length) {
            return;
          }

          if (nextRegistrations.length === 0) {
            nodeListeners?.delete(handle.type);

            if (nodeListeners?.size === 0) {
              draftEventListeners.delete(handle.nodeId);
            }

            return;
          }

          nodeListeners?.set(handle.type, nextRegistrations);
        },
      };

      try {
        const result = fn(transaction);

        nodes = draftNodes;
        eventListeners = draftEventListeners;
        transactionDepth = 0;
        nextTransactionSequence += 1;

        const event: BubbleRuntimeEvent = {
          type: "transaction-committed",
          record: { sequence: nextTransactionSequence, mutations },
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
    snapshot() {
      return createSnapshot();
    },
    dispatchEvent({ type, targetId, data = {}, cancelable = false }) {
      return dispatchEventToTarget({ type, targetId, data, cancelable });
    },
    focus(id) {
      const node = nodes.get(id);

      if (node === undefined) {
        throw new Error(`Unknown node ID: ${id}`);
      }

      assertFocusableNode(node, id);
      if (focusedNodeId === id) {
        return;
      }

      if (focusedNodeId !== null) {
        dispatchEventToTarget({ type: "blur", targetId: focusedNodeId, mode: "target-only" });
      }

      focusedNodeId = id;
      dispatchEventToTarget({ type: "focus", targetId: id, mode: "target-only" });
    },
    blur() {
      if (focusedNodeId === null) {
        return;
      }

      const previouslyFocusedNodeId = focusedNodeId;
      focusedNodeId = null;
      dispatchEventToTarget({ type: "blur", targetId: previouslyFocusedNodeId, mode: "target-only" });
    },
    getFocusedNodeId() {
      return focusedNodeId;
    },
    getTabOrder() {
      return getTabOrder();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
