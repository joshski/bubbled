import { describe, expect, test } from "bun:test";

import {
  BubbleUnsupportedCapabilityError,
  type BubbleScheduler,
  type BubbleTimerHandle,
} from "../bubble-capabilities";
import { createBubble } from "./index";

function createFakeClock(initialTime: number) {
  let currentTime = initialTime;

  return {
    clock: {
      now: () => currentTime,
    },
    advanceBy: (deltaMs: number) => {
      currentTime += deltaMs;
    },
  };
}

function createFakeClockAndTimers(initialTime: number) {
  let currentTime = initialTime;
  let nextTimerId = 0;
  let nextSequence = 0;
  const scheduledTimers = new Map<
    string,
    {
      callback: () => void;
      dueTime: number;
      sequence: number;
    }
  >();

  const runDueTimers = () => {
    while (true) {
      const dueTimers = Array.from(scheduledTimers.entries())
        .filter(([, timer]) => timer.dueTime <= currentTime)
        .sort(
          ([, left], [, right]) => left.dueTime - right.dueTime || left.sequence - right.sequence,
        );

      const nextDueTimer = dueTimers[0];

      if (nextDueTimer === undefined) {
        return;
      }

      const [timerId, timer] = nextDueTimer;
      scheduledTimers.delete(timerId);
      timer.callback();
    }
  };

  return {
    clock: {
      now: () => currentTime,
    },
    timers: {
      setTimeout(callback: () => void, delayMs: number): BubbleTimerHandle {
        nextTimerId += 1;
        nextSequence += 1;

        const handle = { id: `timer:${nextTimerId}` };
        scheduledTimers.set(handle.id, {
          callback,
          dueTime: currentTime + delayMs,
          sequence: nextSequence,
        });

        return handle;
      },
      clearTimeout(handle: BubbleTimerHandle) {
        scheduledTimers.delete(handle.id);
      },
    },
    advanceBy(deltaMs: number) {
      currentTime += deltaMs;
      runDueTimers();
    },
  };
}

function createFakeScheduler() {
  const microtasks: Array<() => void> = [];

  return {
    scheduler: {
      queueMicrotask(task: () => void) {
        microtasks.push(task);
      },
      requestFrame() {
        throw new Error("requestFrame is not implemented in this test fake");
      },
      cancelFrame() {},
    } satisfies BubbleScheduler,
    flushMicrotasks() {
      while (microtasks.length > 0) {
        const task = microtasks.shift() as () => void;
        task();
      }
    },
  };
}

describe("createBubble", () => {
  test("returns a root node with the expected shape", () => {
    const bubble = createBubble();

    expect(bubble.rootId).toBe("root");
    expect(bubble.getRoot()).toEqual({
      id: "root",
      kind: "root",
      children: [],
    });
    expect(bubble.getNode(bubble.rootId)).toEqual(bubble.getRoot());
    expect(bubble.getNode("missing")).toBeNull();
  });

  test("creates isolated bubble instances", () => {
    const firstBubble = createBubble();
    const secondBubble = createBubble();

    const firstElementId = firstBubble.transact((tx) => tx.createElement({ tag: "button" }));
    const secondElementId = secondBubble.transact((tx) => tx.createElement({ tag: "button" }));

    const firstRoot = firstBubble.getRoot();
    const secondRoot = secondBubble.getRoot();

    expect(firstRoot).toEqual(secondRoot);
    expect(firstRoot).not.toBe(secondRoot);
    expect(firstRoot.children).not.toBe(secondRoot.children);
    expect(firstElementId).not.toBe(secondElementId);
    expect(firstBubble.getNode(firstElementId)).toEqual({
      id: firstElementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(secondBubble.getNode(firstElementId)).toBeNull();
    expect(secondBubble.getNode(secondElementId)).toEqual({
      id: secondElementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("resolves registered capabilities from explicit createBubble options", () => {
    const clock = {
      now: () => 123,
    };
    const bubble = createBubble({
      capabilities: {
        clock,
      },
    });

    expect(bubble.resolveCapability("clock")).toBe(clock);
  });

  test("throws a named unsupported error when a capability is missing", () => {
    const bubble = createBubble();

    expect(() => {
      bubble.resolveCapability("clock");
    }).toThrow(BubbleUnsupportedCapabilityError);
  });

  test("keeps capability state isolated between bubble instances", () => {
    let firstTime = 1;
    let secondTime = 100;
    const firstBubble = createBubble({
      capabilities: {
        clock: {
          now: () => {
            const currentTime = firstTime;

            firstTime += 1;

            return currentTime;
          },
        },
      },
    });
    const secondBubble = createBubble({
      capabilities: {
        clock: {
          now: () => {
            const currentTime = secondTime;

            secondTime += 10;

            return currentTime;
          },
        },
      },
    });

    expect(firstBubble.resolveCapability("clock").now()).toBe(1);
    expect(firstBubble.resolveCapability("clock").now()).toBe(2);
    expect(secondBubble.resolveCapability("clock").now()).toBe(100);
    expect(secondBubble.resolveCapability("clock").now()).toBe(110);
  });

  test("returns fake time from now()", () => {
    const { clock } = createFakeClock(123);
    const bubble = createBubble({
      capabilities: {
        clock,
      },
    });

    expect(bubble.now()).toBe(123);
  });

  test("updates now() reads deterministically when fake time advances", () => {
    const fakeClock = createFakeClock(50);
    const bubble = createBubble({
      capabilities: {
        clock: fakeClock.clock,
      },
    });

    expect(bubble.now()).toBe(50);

    fakeClock.advanceBy(25);

    expect(bubble.now()).toBe(75);

    fakeClock.advanceBy(125);

    expect(bubble.now()).toBe(200);
  });

  test("does not leak implicit Date.now() usage into now()", () => {
    const originalDateNow = Date.now;
    const fakeClock = createFakeClock(9001);
    const bubble = createBubble({
      capabilities: {
        clock: fakeClock.clock,
      },
    });

    Date.now = () => {
      throw new Error("Unexpected ambient Date.now() call");
    };

    try {
      expect(bubble.now()).toBe(9001);

      fakeClock.advanceBy(1);

      expect(bubble.now()).toBe(9002);
    } finally {
      Date.now = originalDateNow;
    }
  });

  test("fires a timer only after time advances to its due time", () => {
    const fakeTime = createFakeClockAndTimers(100);
    const bubble = createBubble({
      capabilities: {
        clock: fakeTime.clock,
        timers: fakeTime.timers,
      },
    });
    const firedAt: number[] = [];

    bubble.setTimeout(() => {
      firedAt.push(bubble.now());
    }, 50);

    expect(firedAt).toEqual([]);

    fakeTime.advanceBy(49);

    expect(firedAt).toEqual([]);

    fakeTime.advanceBy(1);

    expect(firedAt).toEqual([150]);
  });

  test("fires multiple timers in due-time order", () => {
    const fakeTime = createFakeClockAndTimers(0);
    const bubble = createBubble({
      capabilities: {
        clock: fakeTime.clock,
        timers: fakeTime.timers,
      },
    });
    const fired: string[] = [];

    bubble.setTimeout(() => {
      fired.push("third");
    }, 30);
    bubble.setTimeout(() => {
      fired.push("first");
    }, 10);
    bubble.setTimeout(() => {
      fired.push("second");
    }, 20);

    fakeTime.advanceBy(30);

    expect(fired).toEqual(["first", "second", "third"]);
  });

  test("does not fire a cancelled timer", () => {
    const fakeTime = createFakeClockAndTimers(25);
    const bubble = createBubble({
      capabilities: {
        clock: fakeTime.clock,
        timers: fakeTime.timers,
      },
    });
    const fired: string[] = [];

    const timerHandle = bubble.setTimeout(() => {
      fired.push("cancelled");
    }, 10);

    bubble.clearTimeout(timerHandle);
    fakeTime.advanceBy(10);

    expect(fired).toEqual([]);
  });

  test("queues scheduled work until the scheduler flushes microtasks", () => {
    const fakeScheduler = createFakeScheduler();
    const bubble = createBubble({
      capabilities: {
        scheduler: fakeScheduler.scheduler,
      },
    });
    const calls: string[] = [];

    bubble.queueMicrotask(() => {
      calls.push("queued");
    });

    expect(calls).toEqual([]);

    fakeScheduler.flushMicrotasks();

    expect(calls).toEqual(["queued"]);
  });

  test("runs queued microtasks in explicit scheduling order", () => {
    const fakeScheduler = createFakeScheduler();
    const bubble = createBubble({
      capabilities: {
        scheduler: fakeScheduler.scheduler,
      },
    });
    const calls: string[] = [];

    bubble.queueMicrotask(() => {
      calls.push("first");
    });
    bubble.queueMicrotask(() => {
      calls.push("second");
    });
    bubble.queueMicrotask(() => {
      calls.push("third");
    });

    fakeScheduler.flushMicrotasks();

    expect(calls).toEqual(["first", "second", "third"]);
  });

  test("flushes re-entrant microtasks after the currently running task", () => {
    const fakeScheduler = createFakeScheduler();
    const bubble = createBubble({
      capabilities: {
        scheduler: fakeScheduler.scheduler,
      },
    });
    const calls: string[] = [];

    bubble.queueMicrotask(() => {
      calls.push("outer");
      bubble.queueMicrotask(() => {
        calls.push("inner");
      });
      calls.push("outer-complete");
    });

    fakeScheduler.flushMicrotasks();

    expect(calls).toEqual(["outer", "outer-complete", "inner"]);
  });

  test("returns read-only root snapshots", () => {
    const bubble = createBubble();
    const root = bubble.getRoot() as { id: string; kind: "root"; children: string[] };

    expect(() => {
      root.children.push("child");
    }).toThrow(TypeError);
    expect(() => {
      root.id = "changed";
    }).toThrow(TypeError);

    expect(bubble.getRoot()).toEqual({
      id: "root",
      kind: "root",
      children: [],
    });
  });

  test("assigns unique IDs to nodes within a bubble instance", () => {
    const bubble = createBubble();

    const nodeIds = bubble.transact((tx) => [
      tx.createElement({ tag: "button" }),
      tx.createElement({ tag: "span", namespace: "svg" }),
      tx.createText({ value: "Save" }),
    ]);

    expect(new Set([bubble.rootId, ...nodeIds]).size).toBe(4);
  });

  test("creates element nodes with the expected shape", () => {
    const bubble = createBubble();

    const { htmlElementId, svgElementId } = bubble.transact((tx) => ({
      htmlElementId: tx.createElement({ tag: "button" }),
      svgElementId: tx.createElement({ tag: "circle", namespace: "svg" }),
    }));

    expect(bubble.getNode(htmlElementId)).toEqual({
      id: htmlElementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(svgElementId)).toEqual({
      id: svgElementId,
      kind: "element",
      tag: "circle",
      namespace: "svg",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("defaults element namespaces to html explicitly", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => tx.createElement({ tag: "section" }));
    const element = bubble.getNode(elementId);

    expect(element).toEqual({
      id: elementId,
      kind: "element",
      tag: "section",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(element?.kind).toBe("element");

    if (element?.kind === "element") {
      expect(Object.hasOwn(element, "namespace")).toBe(true);
      expect(element.namespace).toBe("html");
    }
  });

  test("rejects invalid element tags", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      expect(() => {
        tx.createElement({ tag: "" });
      }).toThrow("Element tag must be a non-empty string");
      expect(() => {
        tx.createElement({ tag: "   " });
      }).toThrow("Element tag must be a non-empty string");
      expect(() => {
        tx.createElement({ tag: 123 as unknown as string });
      }).toThrow("Element tag must be a non-empty string");
    });
  });

  test("creates text nodes with the expected shape", () => {
    const bubble = createBubble();

    const textId = bubble.transact((tx) => tx.createText({ value: "Save" }));

    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: null,
      value: "Save",
    });
  });

  test("updates text nodes in place while preserving node identity", () => {
    const bubble = createBubble();

    const textId = bubble.transact((tx) => {
      const createdTextId = tx.createText({ value: "Save" });

      tx.setText({ nodeId: createdTextId, value: "Saved" });

      return createdTextId;
    });

    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: null,
      value: "Saved",
    });
    expect(bubble.getNode(textId)?.id).toBe(textId);
  });

  test("inserts a child into an empty parent", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdElementId, index: 0 });

      return createdElementId;
    });

    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [elementId],
    });
    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("inserts children at the front, middle, and end", () => {
    const bubble = createBubble();

    const childIds = bubble.transact((tx) => {
      const firstId = tx.createElement({ tag: "header" });
      const secondId = tx.createElement({ tag: "main" });
      const thirdId = tx.createElement({ tag: "footer" });
      const frontId = tx.createElement({ tag: "nav" });
      const middleId = tx.createElement({ tag: "section" });
      const endId = tx.createElement({ tag: "aside" });

      tx.insertChild({ parentId: bubble.rootId, childId: firstId });
      tx.insertChild({ parentId: bubble.rootId, childId: secondId });
      tx.insertChild({ parentId: bubble.rootId, childId: thirdId });
      tx.insertChild({ parentId: bubble.rootId, childId: frontId, index: 0 });
      tx.insertChild({ parentId: bubble.rootId, childId: middleId, index: 2 });
      tx.insertChild({ parentId: bubble.rootId, childId: endId, index: 5 });

      return { firstId, secondId, thirdId, frontId, middleId, endId };
    });

    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [
        childIds.frontId,
        childIds.firstId,
        childIds.middleId,
        childIds.secondId,
        childIds.thirdId,
        childIds.endId,
      ],
    });
    expect(bubble.getNode(childIds.frontId)).toEqual({
      id: childIds.frontId,
      kind: "element",
      tag: "nav",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childIds.middleId)).toEqual({
      id: childIds.middleId,
      kind: "element",
      tag: "section",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childIds.endId)).toEqual({
      id: childIds.endId,
      kind: "element",
      tag: "aside",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("removes an only child from its parent", () => {
    const bubble = createBubble();

    const childId = bubble.transact((tx) => {
      const createdChildId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdChildId });
      tx.removeChild({ parentId: bubble.rootId, childId: createdChildId });

      return createdChildId;
    });

    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [],
    });
    expect(bubble.getNode(childId)).toEqual({
      id: childId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("removes the first, middle, and last child", () => {
    const bubble = createBubble();

    const childIds = bubble.transact((tx) => {
      const firstId = tx.createElement({ tag: "header" });
      const middleId = tx.createElement({ tag: "main" });
      const lastId = tx.createElement({ tag: "footer" });
      const remainingId = tx.createElement({ tag: "section" });

      tx.insertChild({ parentId: bubble.rootId, childId: firstId });
      tx.insertChild({ parentId: bubble.rootId, childId: middleId });
      tx.insertChild({ parentId: bubble.rootId, childId: lastId });
      tx.insertChild({ parentId: bubble.rootId, childId: remainingId, index: 1 });

      tx.removeChild({ parentId: bubble.rootId, childId: firstId });
      tx.removeChild({ parentId: bubble.rootId, childId: remainingId });
      tx.removeChild({ parentId: bubble.rootId, childId: lastId });

      return { firstId, middleId, lastId, remainingId };
    });

    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [childIds.middleId],
    });
    expect(bubble.getNode(childIds.firstId)).toEqual({
      id: childIds.firstId,
      kind: "element",
      tag: "header",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childIds.remainingId)).toEqual({
      id: childIds.remainingId,
      kind: "element",
      tag: "section",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childIds.lastId)).toEqual({
      id: childIds.lastId,
      kind: "element",
      tag: "footer",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childIds.middleId)).toEqual({
      id: childIds.middleId,
      kind: "element",
      tag: "main",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("detaches a removed node cleanly", () => {
    const bubble = createBubble();

    const { parentId, childId, grandchildId } = bubble.transact((tx) => {
      const createdParentId = tx.createElement({ tag: "article" });
      const createdChildId = tx.createElement({ tag: "section" });
      const createdGrandchildId = tx.createText({ value: "Hello" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdParentId });
      tx.insertChild({ parentId: createdParentId, childId: createdChildId });
      tx.insertChild({ parentId: createdChildId, childId: createdGrandchildId });
      tx.removeChild({ parentId: createdParentId, childId: createdChildId });

      return {
        parentId: createdParentId,
        childId: createdChildId,
        grandchildId: createdGrandchildId,
      };
    });

    expect(bubble.getNode(parentId)).toEqual({
      id: parentId,
      kind: "element",
      tag: "article",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childId)).toEqual({
      id: childId,
      kind: "element",
      tag: "section",
      namespace: "html",
      parentId: null,
      children: [grandchildId],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(grandchildId)).toEqual({
      id: grandchildId,
      kind: "text",
      parentId: childId,
      value: "Hello",
    });
  });

  test("moves children forward and backward", () => {
    const bubble = createBubble();

    const childIds = bubble.transact((tx) => {
      const firstId = tx.createElement({ tag: "header" });
      const secondId = tx.createElement({ tag: "main" });
      const thirdId = tx.createElement({ tag: "footer" });

      tx.insertChild({ parentId: bubble.rootId, childId: firstId });
      tx.insertChild({ parentId: bubble.rootId, childId: secondId });
      tx.insertChild({ parentId: bubble.rootId, childId: thirdId });

      tx.moveChild({ parentId: bubble.rootId, childId: firstId, index: 2 });
      tx.moveChild({ parentId: bubble.rootId, childId: thirdId, index: 0 });

      return { firstId, secondId, thirdId };
    });

    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [childIds.thirdId, childIds.secondId, childIds.firstId],
    });
    expect(bubble.getNode(childIds.firstId)).toEqual({
      id: childIds.firstId,
      kind: "element",
      tag: "header",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childIds.thirdId)).toEqual({
      id: childIds.thirdId,
      kind: "element",
      tag: "footer",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("preserves node identity after moving a child", () => {
    const bubble = createBubble();

    const { parentId, childId } = bubble.transact((tx) => {
      const createdParentId = tx.createElement({ tag: "article" });
      const createdChildId = tx.createElement({ tag: "section" });
      const siblingId = tx.createElement({ tag: "aside" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdParentId });
      tx.insertChild({ parentId: createdParentId, childId: createdChildId });
      tx.insertChild({ parentId: createdParentId, childId: siblingId });

      tx.moveChild({ parentId: createdParentId, childId: createdChildId, index: 1 });

      return {
        parentId: createdParentId,
        childId: createdChildId,
      };
    });

    expect(bubble.getNode(childId)).toEqual({
      id: childId,
      kind: "element",
      tag: "section",
      namespace: "html",
      parentId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(childId)?.id).toBe(childId);
    expect(bubble.getNode(parentId)).toEqual({
      id: parentId,
      kind: "element",
      tag: "article",
      namespace: "html",
      parentId: bubble.rootId,
      children: expect.arrayContaining([childId]),
      attributes: {},
      properties: {},
    });
  });

  test("does not expose uncommitted changes to subscribers", () => {
    const bubble = createBubble();
    const observedRoots: Array<ReturnType<typeof bubble.getRoot>> = [];

    bubble.subscribe((event) => {
      expect(event.type).toBe("transaction-committed");
      observedRoots.push(bubble.getRoot());
    });

    bubble.transact((tx) => {
      const elementId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: elementId });

      expect(observedRoots).toEqual([]);
      expect(bubble.getRoot()).toEqual({
        id: bubble.rootId,
        kind: "root",
        children: [],
      });
    });

    expect(observedRoots).toEqual([
      {
        id: bubble.rootId,
        kind: "root",
        children: [expect.any(String)],
      },
    ]);
  });

  test("publishes committed changes atomically", () => {
    const bubble = createBubble();
    const observedNodes: Array<{
      root: ReturnType<typeof bubble.getRoot>;
      element: ReturnType<typeof bubble.getNode>;
      text: ReturnType<typeof bubble.getNode>;
    }> = [];

    const { elementId, textId } = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });
      const createdTextId = tx.createText({ value: "Saved" });

      tx.setAttribute({ nodeId: createdElementId, name: "type", value: "button" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdElementId });
      tx.insertChild({ parentId: createdElementId, childId: createdTextId });

      return {
        elementId: createdElementId,
        textId: createdTextId,
      };
    });

    bubble.subscribe(() => {
      observedNodes.push({
        root: bubble.getRoot(),
        element: bubble.getNode(elementId),
        text: bubble.getNode(textId),
      });
    });

    bubble.transact((tx) => {
      tx.setAttribute({ nodeId: elementId, name: "role", value: "status" });
      tx.setText({ nodeId: textId, value: "Committed" });
    });

    expect(observedNodes).toEqual([
      {
        root: {
          id: bubble.rootId,
          kind: "root",
          children: [elementId],
        },
        element: {
          id: elementId,
          kind: "element",
          tag: "button",
          namespace: "html",
          parentId: bubble.rootId,
          children: [textId],
          attributes: {
            type: "button",
            role: "status",
          },
          properties: {},
        },
        text: {
          id: textId,
          kind: "text",
          parentId: elementId,
          value: "Committed",
        },
      },
    ]);
  });

  test("records a single committed mutation", () => {
    const bubble = createBubble();
    let transactionRecord: { sequence: number; mutations: readonly unknown[] } | null = null;

    bubble.subscribe((event) => {
      transactionRecord = event.record;
    });

    const nodeId = bubble.transact((tx) => tx.createElement({ tag: "button" }));

    expect(nodeId).toMatch(/^node:\d+:\d+$/);
    expect(transactionRecord).toEqual({
      sequence: 1,
      mutations: [{ type: "node-created", nodeId, kind: "element" }],
    });
  });

  test("records committed mutations in transaction order", () => {
    const bubble = createBubble();
    const observedRecords: Array<{ sequence: number; mutations: readonly unknown[] }> = [];

    bubble.subscribe((event) => {
      observedRecords.push(event.record);
    });

    const ids = bubble.transact((tx) => {
      const parentId = tx.createElement({ tag: "button" });
      const childId = tx.createText({ value: "Save" });

      tx.setAttribute({ nodeId: parentId, name: "type", value: "button" });
      tx.insertChild({ parentId: bubble.rootId, childId: parentId });
      tx.insertChild({ parentId, childId });
      tx.setText({ nodeId: childId, value: "Saved" });
      tx.setProperty({ nodeId: parentId, name: "disabled", value: true });

      return { parentId, childId };
    });

    expect(observedRecords).toEqual([
      {
        sequence: 1,
        mutations: [
          { type: "node-created", nodeId: ids.parentId, kind: "element" },
          { type: "node-created", nodeId: ids.childId, kind: "text" },
          { type: "attribute-set", nodeId: ids.parentId, name: "type", value: "button" },
          {
            type: "child-inserted",
            parentId: bubble.rootId,
            childId: ids.parentId,
            index: 0,
          },
          {
            type: "child-inserted",
            parentId: ids.parentId,
            childId: ids.childId,
            index: 0,
          },
          { type: "text-set", nodeId: ids.childId, value: "Saved" },
          { type: "property-set", nodeId: ids.parentId, name: "disabled", value: true },
        ],
      },
    ]);
  });

  test("emits an explicit empty mutation record for empty transactions", () => {
    const bubble = createBubble();
    const observedRecords: Array<{ sequence: number; mutations: readonly unknown[] }> = [];

    bubble.subscribe((event) => {
      observedRecords.push(event.record);
    });

    bubble.transact(() => undefined);

    expect(observedRecords).toEqual([{ sequence: 1, mutations: [] }]);
  });

  test("rejects nested transactions explicitly", () => {
    const bubble = createBubble();

    expect(() => {
      bubble.transact(() => {
        bubble.transact(() => bubble.rootId);
      });
    }).toThrow("Nested transactions are not supported");
  });

  test("leaves the tree unchanged when a transaction throws during mutation application", () => {
    const bubble = createBubble();
    let committedEvents = 0;

    bubble.subscribe(() => {
      committedEvents += 1;
    });

    const initialTree = bubble.transact((tx) => {
      const sectionId = tx.createElement({ tag: "section" });
      const titleId = tx.createElement({ tag: "h1" });
      const textId = tx.createText({ value: "Stable" });

      tx.insertChild({ parentId: bubble.rootId, childId: sectionId });
      tx.insertChild({ parentId: sectionId, childId: titleId });
      tx.insertChild({ parentId: titleId, childId: textId });
      tx.setAttribute({ nodeId: sectionId, name: "role", value: "region" });

      return { sectionId, titleId, textId };
    });

    const rootBefore = bubble.getRoot();
    const sectionBefore = bubble.getNode(initialTree.sectionId);
    const titleBefore = bubble.getNode(initialTree.titleId);
    const textBefore = bubble.getNode(initialTree.textId);
    let failedChildId: string | null = null;

    expect(() => {
      bubble.transact((tx) => {
        failedChildId = tx.createElement({ tag: "aside" });
        tx.setAttribute({
          nodeId: initialTree.sectionId,
          name: "data-state",
          value: "dirty",
        });
        tx.insertChild({ parentId: initialTree.sectionId, childId: failedChildId, index: 0 });
        tx.setText({ nodeId: initialTree.textId, value: "Leaked" });

        throw new Error("boom");
      });
    }).toThrow("boom");

    expect(committedEvents).toBe(1);
    expect(bubble.getRoot()).toEqual(rootBefore);
    expect(bubble.getNode(initialTree.sectionId)).toEqual(sectionBefore);
    expect(bubble.getNode(initialTree.titleId)).toEqual(titleBefore);
    expect(bubble.getNode(initialTree.textId)).toEqual(textBefore);
    expect(failedChildId).not.toBeNull();
    expect(bubble.getNode(failedChildId as string)).toBeNull();
  });

  test("preserves node identities and child order after rolling back a failed reorder", () => {
    const bubble = createBubble();

    const tree = bubble.transact((tx) => {
      const parentId = tx.createElement({ tag: "ul" });
      const firstId = tx.createElement({ tag: "li" });
      const secondId = tx.createElement({ tag: "li" });
      const thirdId = tx.createElement({ tag: "li" });

      tx.insertChild({ parentId: bubble.rootId, childId: parentId });
      tx.insertChild({ parentId, childId: firstId });
      tx.insertChild({ parentId, childId: secondId });
      tx.insertChild({ parentId, childId: thirdId });

      return { parentId, firstId, secondId, thirdId };
    });

    const parentBefore = bubble.getNode(tree.parentId);
    const firstBefore = bubble.getNode(tree.firstId);
    const secondBefore = bubble.getNode(tree.secondId);
    const thirdBefore = bubble.getNode(tree.thirdId);

    expect(() => {
      bubble.transact((tx) => {
        tx.moveChild({ parentId: tree.parentId, childId: tree.thirdId, index: 0 });
        tx.removeChild({ parentId: tree.parentId, childId: tree.secondId });
        tx.insertChild({ parentId: tree.parentId, childId: tree.secondId, index: 2 });

        throw new Error("rollback");
      });
    }).toThrow("rollback");

    expect(bubble.getNode(tree.parentId)).toEqual(parentBefore);
    expect(bubble.getNode(tree.firstId)).toEqual(firstBefore);
    expect(bubble.getNode(tree.secondId)).toEqual(secondBefore);
    expect(bubble.getNode(tree.thirdId)).toEqual(thirdBefore);
    expect(bubble.getNode(tree.parentId)).toEqual({
      id: tree.parentId,
      kind: "element",
      tag: "ul",
      namespace: "html",
      parentId: bubble.rootId,
      children: [tree.firstId, tree.secondId, tree.thirdId],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(tree.firstId)?.id).toBe(tree.firstId);
    expect(bubble.getNode(tree.secondId)?.id).toBe(tree.secondId);
    expect(bubble.getNode(tree.thirdId)?.id).toBe(tree.thirdId);
  });

  test("stops notifying listeners after unsubscribe", () => {
    const bubble = createBubble();
    const listener = () => {
      throw new Error("listener should have been unsubscribed");
    };

    const unsubscribe = bubble.subscribe(listener);

    unsubscribe();

    expect(() => {
      bubble.transact((tx) => {
        tx.createElement({ tag: "button" });
      });
    }).not.toThrow();
  });

  test("target listener receives event data", () => {
    const bubble = createBubble();
    const receivedEvents: Array<Record<string, unknown>> = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          receivedEvents.push(event.data);
        },
      });

      return createdButtonId;
    });

    const result = bubble.dispatchEvent({
      type: "click",
      targetId: buttonId,
      data: { source: "test" },
      cancelable: true,
    });

    expect(result).toEqual({ defaultPrevented: false, delivered: true });
    expect(receivedEvents).toEqual([{ source: "test" }]);
  });

  test("event object exposes type and target", () => {
    const bubble = createBubble();
    const receivedEvents: unknown[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          event.preventDefault();
          event.stopPropagation();
          receivedEvents.push(event);
        },
      });

      return createdButtonId;
    });

    expect(
      bubble.dispatchEvent({
        type: "click",
        targetId: buttonId,
        data: { source: "test" },
        cancelable: true,
      }),
    ).toEqual({ defaultPrevented: true, delivered: true });
    expect(receivedEvents).toEqual([
      {
        type: "click",
        targetId: buttonId,
        currentTargetId: buttonId,
        phase: "target",
        cancelable: true,
        defaultPrevented: true,
        data: { source: "test" },
        preventDefault: expect.any(Function),
        stopPropagation: expect.any(Function),
      },
    ]);
  });

  test("makes default prevented state visible to later listeners", () => {
    const bubble = createBubble();
    const observedStates: boolean[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          event.preventDefault();
          observedStates.push(event.defaultPrevented);
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          observedStates.push(event.defaultPrevented);
        },
      });

      return createdButtonId;
    });

    expect(
      bubble.dispatchEvent({
        type: "click",
        targetId: buttonId,
        cancelable: true,
      }),
    ).toEqual({ defaultPrevented: true, delivered: true });
    expect(observedStates).toEqual([true, true]);
  });

  test("reports cancellation from dispatch", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          event.preventDefault();
        },
      });

      return createdButtonId;
    });

    expect(
      bubble.dispatchEvent({
        type: "click",
        targetId: buttonId,
        cancelable: true,
      }),
    ).toEqual({ defaultPrevented: true, delivered: true });
  });

  test("does not cancel non-cancelable events", () => {
    const bubble = createBubble();
    const observedStates: boolean[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          event.preventDefault();
          observedStates.push(event.defaultPrevented);
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          observedStates.push(event.defaultPrevented);
        },
      });

      return createdButtonId;
    });

    expect(
      bubble.dispatchEvent({
        type: "click",
        targetId: buttonId,
      }),
    ).toEqual({ defaultPrevented: false, delivered: true });
    expect(observedStates).toEqual([false, false]);
  });

  test("removes a listener so it no longer fires", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const { buttonId, firstHandle, secondHandle } = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      const createdFirstHandle = tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("first");
        },
      });
      const createdSecondHandle = tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("second");
        },
      });

      return {
        buttonId: createdButtonId,
        firstHandle: createdFirstHandle,
        secondHandle: createdSecondHandle,
      };
    });

    bubble.transact((tx) => {
      tx.removeEventListener(firstHandle);
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["second"]);

    bubble.transact((tx) => {
      tx.removeEventListener(secondHandle);
      tx.removeEventListener(secondHandle);
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: false,
    });
    expect(calls).toEqual(["second"]);
  });

  test("ignores removing a listener handle that does not match a registered listener", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const { buttonId, registeredHandle } = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      const createdHandle = tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("registered");
        },
      });

      return {
        buttonId: createdButtonId,
        registeredHandle: createdHandle,
      };
    });

    bubble.transact((tx) => {
      tx.removeEventListener({
        ...registeredHandle,
        internalId: `${registeredHandle.internalId}:missing`,
      });
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["registered"]);
  });

  test("fires multiple listeners on the same node in registration order", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("first");
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("second");
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "focus",
        listener: () => {
          calls.push("wrong-type");
        },
      });

      return createdButtonId;
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["first", "second"]);
  });

  test("runs parent capture listeners before target listeners", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const { parentId, buttonId } = bubble.transact((tx) => {
      const createdParentId = tx.createElement({ tag: "div" });
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdParentId });
      tx.insertChild({ parentId: createdParentId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdParentId,
        type: "click",
        capture: true,
        listener: () => {
          calls.push("parent-capture");
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("target");
        },
      });

      return {
        parentId: createdParentId,
        buttonId: createdButtonId,
      };
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(parentId).not.toBe(buttonId);
    expect(calls).toEqual(["parent-capture", "target"]);
  });

  test("runs parent bubble listeners after target listeners", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdParentId = tx.createElement({ tag: "div" });
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdParentId });
      tx.insertChild({ parentId: createdParentId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("target");
        },
      });
      tx.addEventListener({
        nodeId: createdParentId,
        type: "click",
        listener: () => {
          calls.push("parent-bubble");
        },
      });

      return createdButtonId;
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["target", "parent-bubble"]);
  });

  test("sets current target and phase for each propagation step", () => {
    const bubble = createBubble();
    const receivedSteps: Array<{
      currentTargetId: string;
      phase: "capture" | "target" | "bubble";
    }> = [];

    const { parentId, buttonId } = bubble.transact((tx) => {
      const createdParentId = tx.createElement({ tag: "section" });
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdParentId });
      tx.insertChild({ parentId: createdParentId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdParentId,
        type: "click",
        capture: true,
        listener: (event) => {
          receivedSteps.push({
            currentTargetId: event.currentTargetId,
            phase: event.phase,
          });
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          receivedSteps.push({
            currentTargetId: event.currentTargetId,
            phase: event.phase,
          });
        },
      });
      tx.addEventListener({
        nodeId: createdParentId,
        type: "click",
        listener: (event) => {
          receivedSteps.push({
            currentTargetId: event.currentTargetId,
            phase: event.phase,
          });
        },
      });

      return {
        parentId: createdParentId,
        buttonId: createdButtonId,
      };
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(receivedSteps).toEqual([
      { currentTargetId: parentId, phase: "capture" },
      { currentTargetId: buttonId, phase: "target" },
      { currentTargetId: parentId, phase: "bubble" },
    ]);
  });

  test("stops further propagation during capture", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const grandparentId = tx.createElement({ tag: "main" });
      const parentId = tx.createElement({ tag: "section" });
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: grandparentId });
      tx.insertChild({ parentId: grandparentId, childId: parentId });
      tx.insertChild({ parentId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: grandparentId,
        type: "click",
        capture: true,
        listener: () => {
          calls.push("grandparent-capture");
        },
      });
      tx.addEventListener({
        nodeId: parentId,
        type: "click",
        capture: true,
        listener: (event) => {
          calls.push("parent-capture");
          event.stopPropagation();
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("target");
        },
      });
      tx.addEventListener({
        nodeId: grandparentId,
        type: "click",
        listener: () => {
          calls.push("grandparent-bubble");
        },
      });

      return createdButtonId;
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["grandparent-capture", "parent-capture"]);
  });

  test("stops further propagation at the target", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const parentId = tx.createElement({ tag: "section" });
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: parentId });
      tx.insertChild({ parentId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          calls.push("target-first");
          event.stopPropagation();
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("target-second");
        },
      });
      tx.addEventListener({
        nodeId: parentId,
        type: "click",
        listener: () => {
          calls.push("parent-bubble");
        },
      });

      return createdButtonId;
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["target-first", "target-second"]);
  });

  test("does not rewind listeners that already ran before propagation stops", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const grandparentId = tx.createElement({ tag: "main" });
      const parentId = tx.createElement({ tag: "section" });
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: grandparentId });
      tx.insertChild({ parentId: grandparentId, childId: parentId });
      tx.insertChild({ parentId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: grandparentId,
        type: "click",
        capture: true,
        listener: () => {
          calls.push("grandparent-capture");
        },
      });
      tx.addEventListener({
        nodeId: parentId,
        type: "click",
        capture: true,
        listener: () => {
          calls.push("parent-capture-first");
        },
      });
      tx.addEventListener({
        nodeId: parentId,
        type: "click",
        capture: true,
        listener: (event) => {
          calls.push("parent-capture-second");
          event.stopPropagation();
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("target");
        },
      });

      return createdButtonId;
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual([
      "grandparent-capture",
      "parent-capture-first",
      "parent-capture-second",
    ]);
  });

  test("rethrows listener errors from dispatch", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          throw new Error("listener failed");
        },
      });

      return createdButtonId;
    });

    expect(() => {
      bubble.dispatchEvent({ type: "click", targetId: buttonId });
    }).toThrow("listener failed");
  });

  test("stops delivering later listeners after a listener throws", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("first");
          throw new Error("listener failed");
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: () => {
          calls.push("second");
        },
      });

      return createdButtonId;
    });

    expect(() => {
      bubble.dispatchEvent({ type: "click", targetId: buttonId });
    }).toThrow("listener failed");
    expect(calls).toEqual(["first"]);
  });

  test("leaves the tree unchanged when a listener throws", () => {
    const bubble = createBubble();

    const { sectionId, buttonId, textId } = bubble.transact((tx) => {
      const createdSectionId = tx.createElement({ tag: "section" });
      const createdButtonId = tx.createElement({ tag: "button" });
      const createdTextId = tx.createText({ value: "Stable" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdSectionId });
      tx.insertChild({ parentId: createdSectionId, childId: createdButtonId });
      tx.insertChild({ parentId: createdButtonId, childId: createdTextId });
      tx.setAttribute({ nodeId: createdSectionId, name: "role", value: "region" });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "click",
        listener: (event) => {
          event.preventDefault();
          event.stopPropagation();
          throw new Error("listener failed");
        },
      });

      return {
        sectionId: createdSectionId,
        buttonId: createdButtonId,
        textId: createdTextId,
      };
    });

    const rootBefore = bubble.getRoot();
    const sectionBefore = bubble.getNode(sectionId);
    const buttonBefore = bubble.getNode(buttonId);
    const textBefore = bubble.getNode(textId);

    expect(() => {
      bubble.dispatchEvent({
        type: "click",
        targetId: buttonId,
        data: { source: "test" },
        cancelable: true,
      });
    }).toThrow("listener failed");

    expect(bubble.getRoot()).toEqual(rootBefore);
    expect(bubble.getNode(sectionId)).toEqual(sectionBefore);
    expect(bubble.getNode(buttonId)).toEqual(buttonBefore);
    expect(bubble.getNode(textId)).toEqual(textBefore);
  });

  test("rejects listener registration with invalid targets and event names", () => {
    const bubble = createBubble();
    const textId = bubble.transact((tx) => tx.createText({ value: "hello" }));

    expect(() => {
      bubble.transact((tx) => {
        tx.addEventListener({
          nodeId: textId,
          type: "click",
          listener: () => undefined,
        });
      });
    }).toThrow(`Event listeners are only supported on element nodes: ${textId}`);

    expect(() => {
      bubble.transact((tx) => {
        const buttonId = tx.createElement({ tag: "button" });

        tx.addEventListener({
          nodeId: buttonId,
          type: "   ",
          listener: () => undefined,
        });
      });
    }).toThrow("Event type must be a non-empty string");
  });

  test("dispatch to a missing node fails clearly", () => {
    const bubble = createBubble();

    expect(() => {
      bubble.dispatchEvent({ type: "click", targetId: "missing" });
    }).toThrow("Unknown node ID: missing");
  });

  test("dispatch does not deliver to unsupported node types", () => {
    const bubble = createBubble();
    const textId = bubble.transact((tx) => tx.createText({ value: "hello" }));

    expect(bubble.dispatchEvent({ type: "click", targetId: textId })).toEqual({
      defaultPrevented: false,
      delivered: false,
    });
  });

  test("clicking a label forwards activation to an explicitly associated control", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const nodeIds = bubble.transact((tx) => {
      const createdLabelId = tx.createElement({ tag: "label" });
      const inputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdLabelId, name: "for", value: "email" });
      tx.setAttribute({ nodeId: inputId, name: "id", value: "email" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdLabelId });
      tx.insertChild({ parentId: bubble.rootId, childId: inputId });
      tx.addEventListener({
        nodeId: createdLabelId,
        type: "click",
        listener: (event) => {
          calls.push(`label:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });
      tx.addEventListener({
        nodeId: inputId,
        type: "click",
        listener: (event) => {
          calls.push(`input:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });

      return { labelId: createdLabelId, inputId };
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: nodeIds.labelId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual([
      `label:${nodeIds.labelId}:${nodeIds.labelId}:target`,
      `input:${nodeIds.inputId}:${nodeIds.inputId}:target`,
    ]);
  });

  test("clicking a label forwards activation to a nested control after label listeners", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const nodeIds = bubble.transact((tx) => {
      const labelId = tx.createElement({ tag: "label" });
      const spanId = tx.createElement({ tag: "span" });
      const inputId = tx.createElement({ tag: "input" });

      tx.insertChild({ parentId: bubble.rootId, childId: labelId });
      tx.insertChild({ parentId: labelId, childId: spanId });
      tx.insertChild({ parentId: spanId, childId: inputId });
      tx.addEventListener({
        nodeId: labelId,
        type: "click",
        listener: (event) => {
          calls.push(`label:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });
      tx.addEventListener({
        nodeId: inputId,
        type: "click",
        listener: (event) => {
          calls.push(`input:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });

      return { labelId, inputId };
    });

    expect(bubble.dispatchEvent({ type: "click", targetId: nodeIds.labelId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual([
      `label:${nodeIds.labelId}:${nodeIds.labelId}:target`,
      `input:${nodeIds.inputId}:${nodeIds.inputId}:target`,
      `label:${nodeIds.inputId}:${nodeIds.labelId}:bubble`,
    ]);
  });

  test("preventing default on a label click suppresses forwarded activation", () => {
    const bubble = createBubble();
    const calls: string[] = [];

    const labelId = bubble.transact((tx) => {
      const createdLabelId = tx.createElement({ tag: "label" });
      const inputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdLabelId, name: "for", value: "email" });
      tx.setAttribute({ nodeId: inputId, name: "id", value: "email" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdLabelId });
      tx.insertChild({ parentId: bubble.rootId, childId: inputId });
      tx.addEventListener({
        nodeId: createdLabelId,
        type: "click",
        listener: (event) => {
          calls.push("label");
          event.preventDefault();
        },
      });
      tx.addEventListener({
        nodeId: inputId,
        type: "click",
        listener: () => {
          calls.push("input");
        },
      });

      return createdLabelId;
    });

    expect(
      bubble.dispatchEvent({ type: "click", targetId: labelId, cancelable: true }),
    ).toEqual({
      defaultPrevented: true,
      delivered: true,
    });
    expect(calls).toEqual(["label"]);
  });

  test("sets a new attribute on an element", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });

      tx.setAttribute({ nodeId: createdElementId, name: "type", value: "button" });

      return createdElementId;
    });

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: { type: "button" },
      properties: {},
    });
  });

  test("updates an existing attribute on an element", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdElementId, name: "type", value: "text" });
      tx.setAttribute({ nodeId: createdElementId, name: "type", value: "email" });

      return createdElementId;
    });

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "input",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: { type: "email" },
      properties: {},
    });
  });

  test("removes an attribute from an element", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });

      tx.setAttribute({ nodeId: createdElementId, name: "type", value: "button" });
      tx.removeAttribute({ nodeId: createdElementId, name: "type" });

      return createdElementId;
    });

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("sets and overwrites an element property", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "input" });

      tx.setProperty({ nodeId: createdElementId, name: "value", value: "first@example.com" });
      tx.setProperty({ nodeId: createdElementId, name: "value", value: "second@example.com" });

      return createdElementId;
    });

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "input",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: { value: "second@example.com" },
    });
  });

  test("defaults text input values to an empty string", () => {
    const bubble = createBubble();

    const inputId = bubble.transact((tx) => tx.createElement({ tag: "input" }));
    const input = bubble.getNode(inputId) as { kind: "element"; value: string | null };

    expect(input.kind).toBe("element");
    expect(input.value).toBe("");
    expect(bubble.getNode(inputId)).toEqual({
      id: inputId,
      kind: "element",
      tag: "input",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("exposes the current text input value property", () => {
    const bubble = createBubble();

    const inputId = bubble.transact((tx) => {
      const createdInputId = tx.createElement({ tag: "input" });

      tx.setProperty({ nodeId: createdInputId, name: "value", value: "draft@example.com" });

      return createdInputId;
    });

    const input = bubble.getNode(inputId) as {
      kind: "element";
      value: string | null;
      properties: Record<string, unknown>;
    };

    expect(input.kind).toBe("element");
    expect(input.value).toBe("draft@example.com");
    expect(input.properties).toEqual({ value: "draft@example.com" });
  });

  test("defaults checkbox inputs to an unchecked state", () => {
    const bubble = createBubble();

    const inputId = bubble.transact((tx) => {
      const createdInputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdInputId, name: "type", value: "checkbox" });

      return createdInputId;
    });
    const input = bubble.getNode(inputId) as {
      kind: "element";
      checked: boolean | null;
      properties: Record<string, unknown>;
    };

    expect(input.kind).toBe("element");
    expect(input.checked).toBe(false);
    expect(input.properties).toEqual({});
  });

  test("sets checkbox inputs checked and unchecked", () => {
    const bubble = createBubble();

    const checkedInputId = bubble.transact((tx) => {
      const createdInputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdInputId, name: "type", value: "checkbox" });
      tx.setProperty({ nodeId: createdInputId, name: "checked", value: true });

      return createdInputId;
    });
    const checkedInput = bubble.getNode(checkedInputId) as {
      kind: "element";
      checked: boolean | null;
      properties: Record<string, unknown>;
    };

    expect(checkedInput.kind).toBe("element");
    expect(checkedInput.checked).toBe(true);
    expect(checkedInput.properties).toEqual({ checked: true });

    bubble.transact((tx) => {
      tx.setProperty({ nodeId: checkedInputId, name: "checked", value: false });
    });

    const uncheckedInput = bubble.getNode(checkedInputId) as {
      kind: "element";
      checked: boolean | null;
      properties: Record<string, unknown>;
    };

    expect(uncheckedInput.kind).toBe("element");
    expect(uncheckedInput.checked).toBe(false);
    expect(uncheckedInput.properties).toEqual({ checked: false });
  });

  test("serializes checkbox checked state in snapshots", () => {
    const bubble = createBubble();

    const inputIds = bubble.transact((tx) => {
      const checkedInputId = tx.createElement({ tag: "input" });
      const uncheckedInputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: checkedInputId, name: "type", value: "checkbox" });
      tx.setAttribute({ nodeId: uncheckedInputId, name: "type", value: "checkbox" });
      tx.setProperty({ nodeId: checkedInputId, name: "checked", value: true });
      tx.setProperty({ nodeId: uncheckedInputId, name: "checked", value: false });

      tx.insertChild({ parentId: bubble.rootId, childId: checkedInputId });
      tx.insertChild({ parentId: bubble.rootId, childId: uncheckedInputId });

      return { checkedInputId, uncheckedInputId };
    });
    const snapshot = bubble.snapshot();
    const checkedInput = snapshot.nodes.get(inputIds.checkedInputId) as {
      kind: "element";
      checked: boolean | null;
      properties: Record<string, unknown>;
    };
    const uncheckedInput = snapshot.nodes.get(inputIds.uncheckedInputId) as {
      kind: "element";
      checked: boolean | null;
      properties: Record<string, unknown>;
    };

    expect(checkedInput.kind).toBe("element");
    expect(uncheckedInput.kind).toBe("element");
    expect(checkedInput.checked).toBe(true);
    expect(uncheckedInput.checked).toBe(false);
    expect(checkedInput.properties).toEqual({ checked: true });
    expect(uncheckedInput.properties).toEqual({ checked: false });
  });

  test("serializes text inputs into a deterministic form payload", () => {
    const bubble = createBubble();

    const formId = bubble.transact((tx) => {
      const createdFormId = tx.createElement({ tag: "form" });
      const firstInputId = tx.createElement({ tag: "input" });
      const fieldsetId = tx.createElement({ tag: "fieldset" });
      const secondInputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: firstInputId, name: "name", value: "email" });
      tx.setProperty({ nodeId: firstInputId, name: "value", value: "first@example.com" });
      tx.setAttribute({ nodeId: secondInputId, name: "name", value: "backupEmail" });
      tx.setProperty({ nodeId: secondInputId, name: "value", value: "second@example.com" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFormId });
      tx.insertChild({ parentId: createdFormId, childId: firstInputId });
      tx.insertChild({ parentId: createdFormId, childId: fieldsetId });
      tx.insertChild({ parentId: fieldsetId, childId: secondInputId });

      return createdFormId;
    });

    expect(bubble.serializeForm(formId)).toEqual([
      { name: "email", value: "first@example.com" },
      { name: "backupEmail", value: "second@example.com" },
    ]);
  });

  test("includes only checked checkbox controls in form payloads", () => {
    const bubble = createBubble();

    const formId = bubble.transact((tx) => {
      const createdFormId = tx.createElement({ tag: "form" });
      const uncheckedCheckboxId = tx.createElement({ tag: "input" });
      const checkedCheckboxId = tx.createElement({ tag: "input" });
      const defaultValueCheckboxId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: uncheckedCheckboxId, name: "type", value: "checkbox" });
      tx.setAttribute({ nodeId: uncheckedCheckboxId, name: "name", value: "newsletter" });

      tx.setAttribute({ nodeId: checkedCheckboxId, name: "type", value: "checkbox" });
      tx.setAttribute({ nodeId: checkedCheckboxId, name: "name", value: "alerts" });
      tx.setAttribute({ nodeId: checkedCheckboxId, name: "value", value: "daily" });
      tx.setProperty({ nodeId: checkedCheckboxId, name: "checked", value: true });

      tx.setAttribute({ nodeId: defaultValueCheckboxId, name: "type", value: "checkbox" });
      tx.setAttribute({ nodeId: defaultValueCheckboxId, name: "name", value: "tos" });
      tx.setProperty({ nodeId: defaultValueCheckboxId, name: "checked", value: true });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFormId });
      tx.insertChild({ parentId: createdFormId, childId: uncheckedCheckboxId });
      tx.insertChild({ parentId: createdFormId, childId: checkedCheckboxId });
      tx.insertChild({ parentId: createdFormId, childId: defaultValueCheckboxId });

      return createdFormId;
    });

    expect(bubble.serializeForm(formId)).toEqual([
      { name: "alerts", value: "daily" },
      { name: "tos", value: "on" },
    ]);
  });

  test("excludes disabled controls from form payloads", () => {
    const bubble = createBubble();

    const formId = bubble.transact((tx) => {
      const createdFormId = tx.createElement({ tag: "form" });
      const enabledInputId = tx.createElement({ tag: "input" });
      const disabledByPropertyId = tx.createElement({ tag: "input" });
      const disabledByAttributeId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: enabledInputId, name: "name", value: "enabled" });
      tx.setProperty({ nodeId: enabledInputId, name: "value", value: "included" });

      tx.setAttribute({ nodeId: disabledByPropertyId, name: "name", value: "propertyDisabled" });
      tx.setProperty({ nodeId: disabledByPropertyId, name: "value", value: "excluded" });
      tx.setProperty({ nodeId: disabledByPropertyId, name: "disabled", value: true });

      tx.setAttribute({ nodeId: disabledByAttributeId, name: "name", value: "attributeDisabled" });
      tx.setProperty({ nodeId: disabledByAttributeId, name: "value", value: "excluded" });
      tx.setAttribute({ nodeId: disabledByAttributeId, name: "disabled", value: "" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFormId });
      tx.insertChild({ parentId: createdFormId, childId: enabledInputId });
      tx.insertChild({ parentId: createdFormId, childId: disabledByPropertyId });
      tx.insertChild({ parentId: createdFormId, childId: disabledByAttributeId });

      return createdFormId;
    });

    expect(bubble.serializeForm(formId)).toEqual([{ name: "enabled", value: "included" }]);
  });

  test("dispatching submit on a form returns the serialized payload", () => {
    const bubble = createBubble();
    const receivedTargets: string[] = [];

    const formId = bubble.transact((tx) => {
      const createdFormId = tx.createElement({ tag: "form" });
      const inputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: inputId, name: "name", value: "email" });
      tx.setProperty({ nodeId: inputId, name: "value", value: "person@example.com" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdFormId });
      tx.insertChild({ parentId: createdFormId, childId: inputId });
      tx.addEventListener({
        nodeId: createdFormId,
        type: "submit",
        listener: (event) => {
          receivedTargets.push(event.currentTargetId);
        },
      });

      return createdFormId;
    });

    expect(bubble.dispatchEvent({ type: "submit", targetId: formId })).toEqual({
      defaultPrevented: false,
      delivered: true,
      payload: [{ name: "email", value: "person@example.com" }],
    });
    expect(receivedTargets).toEqual([formId]);
  });

  test("preventDefault cancels the submit result payload", () => {
    const bubble = createBubble();

    const formId = bubble.transact((tx) => {
      const createdFormId = tx.createElement({ tag: "form" });
      const inputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: inputId, name: "name", value: "email" });
      tx.setProperty({ nodeId: inputId, name: "value", value: "person@example.com" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdFormId });
      tx.insertChild({ parentId: createdFormId, childId: inputId });
      tx.addEventListener({
        nodeId: createdFormId,
        type: "submit",
        listener: (event) => {
          event.preventDefault();
        },
      });

      return createdFormId;
    });

    expect(bubble.dispatchEvent({ type: "submit", targetId: formId })).toEqual({
      defaultPrevented: true,
      delivered: true,
      payload: null,
    });
  });

  test("stores attributes and properties independently", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdElementId, name: "value", value: "attribute-value" });
      tx.setProperty({ nodeId: createdElementId, name: "value", value: "property-value" });

      return createdElementId;
    });

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "input",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: { value: "attribute-value" },
      properties: { value: "property-value" },
    });
  });

  test("allows empty text values", () => {
    const bubble = createBubble();

    const textId = bubble.transact((tx) => tx.createText({ value: "" }));

    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: null,
      value: "",
    });
  });

  test("allows updating text nodes to an empty string", () => {
    const bubble = createBubble();

    const textId = bubble.transact((tx) => {
      const createdTextId = tx.createText({ value: "Save" });

      tx.setText({ nodeId: createdTextId, value: "" });

      return createdTextId;
    });

    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: null,
      value: "",
    });
  });

  test("rejects invalid text values", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      expect(() => {
        tx.createText({ value: undefined as unknown as string });
      }).toThrow("Text value must be a string");
      expect(() => {
        tx.createText({ value: null as unknown as string });
      }).toThrow("Text value must be a string");
      expect(() => {
        tx.createText({ value: 123 as unknown as string });
      }).toThrow("Text value must be a string");
      const textId = tx.createText({ value: "Save" });

      expect(() => {
        tx.setText({ nodeId: textId, value: undefined as unknown as string });
      }).toThrow("Text value must be a string");
      expect(() => {
        tx.setText({ nodeId: textId, value: null as unknown as string });
      }).toThrow("Text value must be a string");
      expect(() => {
        tx.setText({ nodeId: textId, value: 123 as unknown as string });
      }).toThrow("Text value must be a string");
    });
  });

  test("rejects text updates on element nodes", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const elementId = tx.createElement({ tag: "button" });

      expect(() => {
        tx.setText({ nodeId: elementId, value: "Save" });
      }).toThrow(`Text content can only be updated on text nodes: ${elementId}`);
    });
  });

  test("keeps node IDs stable across read operations", () => {
    const bubble = createBubble();

    const { elementId, textId } = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });
      const createdTextId = tx.createText({ value: "Save" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdElementId });
      tx.insertChild({ parentId: createdElementId, childId: createdTextId });

      return { elementId: createdElementId, textId: createdTextId };
    });

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [textId],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [textId],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: elementId,
      value: "Save",
    });
    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: elementId,
      value: "Save",
    });
  });

  test("does not reuse IDs after node removal in the same session", () => {
    const bubble = createBubble();

    const { removedElementId, removedTextId, replacementId } = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });
      const createdTextId = tx.createText({ value: "Save" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdElementId });
      tx.insertChild({ parentId: createdElementId, childId: createdTextId });
      tx.removeChild({ parentId: createdElementId, childId: createdTextId });
      tx.removeChild({ parentId: bubble.rootId, childId: createdElementId });

      return {
        removedElementId: createdElementId,
        removedTextId: createdTextId,
        replacementId: tx.createText({ value: "Later" }),
      };
    });

    expect(replacementId).not.toBe(removedElementId);
    expect(replacementId).not.toBe(removedTextId);
    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [],
    });
    expect(bubble.getNode(removedElementId)).toEqual({
      id: removedElementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(removedTextId)).toEqual({
      id: removedTextId,
      kind: "text",
      parentId: null,
      value: "Save",
    });
    expect(bubble.getNode(replacementId)).toEqual({
      id: replacementId,
      kind: "text",
      parentId: null,
      value: "Later",
    });
  });

  test("returns read-only snapshots for created nodes", () => {
    const bubble = createBubble();

    const { elementId, textId } = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });
      const createdTextId = tx.createText({ value: "Save" });

      tx.insertChild({ parentId: createdElementId, childId: createdTextId });

      return { elementId: createdElementId, textId: createdTextId };
    });

    const element = bubble.getNode(elementId) as {
      id: string;
      kind: "element";
      children: string[];
      attributes: Record<string, string>;
      properties: Record<string, unknown>;
      parentId: string | null;
      tag: string;
      namespace: "html" | "svg";
      value: string | null;
    };
    const text = bubble.getNode(textId) as {
      id: string;
      kind: "text";
      parentId: string | null;
      value: string;
    };

    expect(() => {
      element.children.push("node:99");
    }).toThrow(TypeError);
    expect(() => {
      element.attributes.role = "button";
    }).toThrow(TypeError);
    expect(() => {
      element.properties.disabled = true;
    }).toThrow(TypeError);
    expect(() => {
      element.value = "Changed";
    }).toThrow(TypeError);
    expect(() => {
      text.value = "Changed";
    }).toThrow(TypeError);

    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: null,
      children: [textId],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: elementId,
      value: "Save",
    });
  });

  test("snapshot contains the current tree structure", () => {
    const bubble = createBubble();

    const { sectionId, textId } = bubble.transact((tx) => {
      const createdSectionId = tx.createElement({ tag: "section" });
      const createdTextId = tx.createText({ value: "Hello" });

      tx.setAttribute({ nodeId: createdSectionId, name: "role", value: "status" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdSectionId });
      tx.insertChild({ parentId: createdSectionId, childId: createdTextId });

      return { sectionId: createdSectionId, textId: createdTextId };
    });

    const snapshot = bubble.snapshot();

    expect(snapshot.rootId).toBe(bubble.rootId);
    expect(snapshot.nodes.get(snapshot.rootId)).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [sectionId],
    });
    expect(snapshot.nodes.get(sectionId)).toEqual({
      id: sectionId,
      kind: "element",
      tag: "section",
      namespace: "html",
      parentId: bubble.rootId,
      children: [textId],
      attributes: { role: "status" },
      properties: {},
    });
    expect(snapshot.nodes.get(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: sectionId,
      value: "Hello",
    });
  });

  test("snapshot updates after commit", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });

      return createdButtonId;
    });

    const snapshotBefore = bubble.snapshot();

    bubble.transact((tx) => {
      tx.setAttribute({ nodeId: buttonId, name: "type", value: "button" });
    });

    const snapshotAfter = bubble.snapshot();

    expect(snapshotBefore.nodes.get(buttonId)).toEqual({
      id: buttonId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(snapshotAfter.nodes.get(buttonId)).toEqual({
      id: buttonId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: { type: "button" },
      properties: {},
    });
  });

  test("query locates existing and missing nodes by ID", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });

      return createdButtonId;
    });

    const snapshot = bubble.snapshot();

    expect(snapshot.query.getById(buttonId)).toEqual(snapshot.nodes.get(buttonId));
    expect(snapshot.query.getById("missing")).toBeNull();
  });

  test("query locates element nodes by tag", () => {
    const bubble = createBubble();

    const nodeIds = bubble.transact((tx) => {
      const firstButtonId = tx.createElement({ tag: "button" });
      const paragraphId = tx.createElement({ tag: "p" });
      const secondButtonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Press" });

      tx.insertChild({ parentId: bubble.rootId, childId: firstButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: paragraphId });
      tx.insertChild({ parentId: bubble.rootId, childId: secondButtonId });
      tx.insertChild({ parentId: secondButtonId, childId: textId });

      return { firstButtonId, paragraphId, secondButtonId, textId };
    });

    const snapshot = bubble.snapshot();

    expect(snapshot.query.getByTag("button")).toEqual([
      snapshot.nodes.get(nodeIds.firstButtonId),
      snapshot.nodes.get(nodeIds.secondButtonId),
    ]);
    expect(snapshot.query.getByTag("p")).toEqual([snapshot.nodes.get(nodeIds.paragraphId)]);
    expect(snapshot.query.getByTag("text")).toEqual([]);
  });

  test("query locates element nodes by role and accessible name", () => {
    const bubble = createBubble();

    const nodeIds = bubble.transact((tx) => {
      const cancelButtonId = tx.createElement({ tag: "button" });
      const cancelTextId = tx.createText({ value: "Cancel" });
      const saveButtonId = tx.createElement({ tag: "button" });
      const saveTextId = tx.createText({ value: "Save" });

      tx.insertChild({ parentId: bubble.rootId, childId: cancelButtonId });
      tx.insertChild({ parentId: cancelButtonId, childId: cancelTextId });
      tx.insertChild({ parentId: bubble.rootId, childId: saveButtonId });
      tx.insertChild({ parentId: saveButtonId, childId: saveTextId });

      return { cancelButtonId, saveButtonId };
    });

    const snapshot = bubble.snapshot();

    expect(snapshot.query.getByRole("button")).toEqual([
      snapshot.nodes.get(nodeIds.cancelButtonId),
      snapshot.nodes.get(nodeIds.saveButtonId),
    ]);
    expect(snapshot.query.getByRole("button", { name: "Save" })).toEqual([
      snapshot.nodes.get(nodeIds.saveButtonId),
    ]);
    expect(snapshot.query.getByRole("button", { name: "Missing" })).toEqual([]);
  });

  test("derives the button role for button elements", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => tx.createElement({ tag: "button" }));
    const button = bubble.getNode(buttonId);

    expect(button?.kind).toBe("element");

    if (button?.kind === "element") {
      expect(button.role).toBe("button");
    }
  });

  test("derives the link role for anchors with href", () => {
    const bubble = createBubble();

    const linkId = bubble.transact((tx) => {
      const createdLinkId = tx.createElement({ tag: "a" });

      tx.setAttribute({ nodeId: createdLinkId, name: "href", value: "/docs" });

      return createdLinkId;
    });
    const link = bubble.snapshot().query.getById(linkId);

    expect(link?.kind).toBe("element");

    if (link?.kind === "element") {
      expect(link.role).toBe("link");
    }
  });

  test("derives the textbox role for text inputs", () => {
    const bubble = createBubble();

    const inputId = bubble.transact((tx) => tx.createElement({ tag: "input" }));
    const input = bubble.getNode(inputId);

    expect(input?.kind).toBe("element");

    if (input?.kind === "element") {
      expect(input.role).toBe("textbox");
    }
  });

  test("derives the textbox role for textarea elements", () => {
    const bubble = createBubble();

    const textareaId = bubble.transact((tx) => tx.createElement({ tag: "textarea" }));
    const textarea = bubble.getNode(textareaId);

    expect(textarea?.kind).toBe("element");

    if (textarea?.kind === "element") {
      expect(textarea.role).toBe("textbox");
    }
  });

  test("falls back to a null role for unknown elements", () => {
    const bubble = createBubble();

    const sectionId = bubble.transact((tx) => tx.createElement({ tag: "section" }));
    const section = bubble.snapshot().query.getById(sectionId);

    expect(section?.kind).toBe("element");

    if (section?.kind === "element") {
      expect(section.role).toBeNull();
    }
  });

  test("falls back to a null role for unsupported input types", () => {
    const bubble = createBubble();

    const inputId = bubble.transact((tx) => {
      const createdInputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdInputId, name: "type", value: "checkbox" });

      return createdInputId;
    });
    const input = bubble.getNode(inputId);

    expect(input?.kind).toBe("element");

    if (input?.kind === "element") {
      expect(input.role).toBeNull();
    }
  });

  test("derives an accessible name from text content", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: " Save draft " });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.insertChild({ parentId: createdButtonId, childId: textId });

      return createdButtonId;
    });
    const button = bubble.snapshot().query.getById(buttonId);

    expect(button?.kind).toBe("element");

    if (button?.kind === "element") {
      expect(button.name).toBe("Save draft");
    }
  });

  test("derives an accessible name from aria-label", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Visible text" });

      tx.setAttribute({ nodeId: createdButtonId, name: "aria-label", value: "Hidden label" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.insertChild({ parentId: createdButtonId, childId: textId });

      return createdButtonId;
    });
    const button = bubble.getNode(buttonId);

    expect(button?.kind).toBe("element");

    if (button?.kind === "element") {
      expect(button.name).toBe("Hidden label");
    }
  });

  test("prefers aria-label over text content for the accessible name", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Visible text" });

      tx.setAttribute({ nodeId: createdButtonId, name: "aria-label", value: "Preferred label" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.insertChild({ parentId: createdButtonId, childId: textId });

      return createdButtonId;
    });
    const button = bubble.snapshot().query.getById(buttonId);

    expect(button?.kind).toBe("element");

    if (button?.kind === "element") {
      expect(button.name).toBe("Preferred label");
    }
  });

  test("resolves an explicitly associated label control", () => {
    const bubble = createBubble();

    const nodeIds = bubble.transact((tx) => {
      const labelId = tx.createElement({ tag: "label" });
      const inputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: labelId, name: "for", value: "email" });
      tx.setAttribute({ nodeId: inputId, name: "id", value: "email" });
      tx.insertChild({ parentId: bubble.rootId, childId: labelId });
      tx.insertChild({ parentId: bubble.rootId, childId: inputId });

      return { labelId, inputId };
    });
    const snapshot = bubble.snapshot();

    expect(snapshot.query.getControlForLabel(nodeIds.labelId)).toEqual(snapshot.nodes.get(nodeIds.inputId));
  });

  test("resolves a nested label control", () => {
    const bubble = createBubble();

    const nodeIds = bubble.transact((tx) => {
      const labelId = tx.createElement({ tag: "label" });
      const spanId = tx.createElement({ tag: "span" });
      const inputId = tx.createElement({ tag: "input" });

      tx.insertChild({ parentId: bubble.rootId, childId: labelId });
      tx.insertChild({ parentId: labelId, childId: spanId });
      tx.insertChild({ parentId: spanId, childId: inputId });

      return { labelId, inputId };
    });
    const snapshot = bubble.snapshot();

    expect(snapshot.query.getControlForLabel(nodeIds.labelId)).toEqual(snapshot.nodes.get(nodeIds.inputId));
  });

  test("returns null when a label association cannot be resolved", () => {
    const bubble = createBubble();

    const nodeIds = bubble.transact((tx) => {
      const labelId = tx.createElement({ tag: "label" });
      const sectionId = tx.createElement({ tag: "section" });

      tx.setAttribute({ nodeId: labelId, name: "for", value: "missing-control" });
      tx.insertChild({ parentId: bubble.rootId, childId: labelId });
      tx.insertChild({ parentId: bubble.rootId, childId: sectionId });

      return { labelId, sectionId };
    });
    const snapshot = bubble.snapshot();

    expect(snapshot.query.getControlForLabel(nodeIds.labelId)).toBeNull();
    expect(snapshot.query.getControlForLabel(nodeIds.sectionId)).toBeNull();
  });

  test("returns null when a nested label contains no labelable control", () => {
    const bubble = createBubble();

    const labelId = bubble.transact((tx) => {
      const createdLabelId = tx.createElement({ tag: "label" });
      const spanId = tx.createElement({ tag: "span" });
      const textId = tx.createText({ value: "Email" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdLabelId });
      tx.insertChild({ parentId: createdLabelId, childId: spanId });
      tx.insertChild({ parentId: spanId, childId: textId });

      return createdLabelId;
    });

    expect(bubble.snapshot().query.getControlForLabel(labelId)).toBeNull();
  });

  test("mutating snapshot data does not mutate runtime state", () => {
    const bubble = createBubble();

    const elementId = bubble.transact((tx) => {
      const createdElementId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdElementId });

      return createdElementId;
    });

    const snapshot = bubble.snapshot();
    const snapshotRoot = snapshot.nodes.get(snapshot.rootId) as {
      id: string;
      kind: "root";
      children: string[];
    };
    const snapshotElement = snapshot.nodes.get(elementId) as {
      id: string;
      kind: "element";
      children: string[];
      attributes: Record<string, string>;
      properties: Record<string, unknown>;
      parentId: string | null;
      tag: string;
      namespace: "html" | "svg";
    };

    expect(() => {
      snapshotRoot.children.push("node:mutated");
    }).toThrow(TypeError);
    expect(() => {
      snapshotElement.attributes.role = "mutated";
    }).toThrow(TypeError);
    (snapshot.nodes as Map<string, unknown>).set("node:mutated", {
      id: "node:mutated",
      kind: "text",
      parentId: null,
      value: "Mutated",
    });

    expect(bubble.getRoot()).toEqual({
      id: bubble.rootId,
      kind: "root",
      children: [elementId],
    });
    expect(bubble.getNode(elementId)).toEqual({
      id: elementId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(bubble.getNode("node:mutated")).toBeNull();
  });

  test("query returns read-only views", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });

      return createdButtonId;
    });

    const snapshot = bubble.snapshot();
    const queriedButton = snapshot.query.getById(buttonId) as {
      id: string;
      kind: "element";
      children: string[];
      attributes: Record<string, string>;
      properties: Record<string, unknown>;
      parentId: string | null;
      tag: string;
      namespace: "html" | "svg";
    };
    const queriedButtons = snapshot.query.getByTag("button") as Array<unknown>;

    expect(() => {
      queriedButton.attributes.role = "mutated";
    }).toThrow(TypeError);
    expect(() => {
      queriedButtons.push("node:mutated");
    }).toThrow(TypeError);

    expect(snapshot.query.getById(buttonId)).toEqual({
      id: buttonId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
    expect(snapshot.query.getByTag("button")).toEqual([snapshot.nodes.get(buttonId)]);
    expect(bubble.getNode(buttonId)).toEqual({
      id: buttonId,
      kind: "element",
      tag: "button",
      namespace: "html",
      parentId: bubble.rootId,
      children: [],
      attributes: {},
      properties: {},
    });
  });

  test("focusing a focusable node sets active focus", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });

      return createdButtonId;
    });

    bubble.focus(buttonId);

    expect(bubble.getFocusedNodeId()).toBe(buttonId);
  });

  test("focusing a second node clears the first", () => {
    const bubble = createBubble();

    const { firstButtonId, secondButtonId } = bubble.transact((tx) => {
      const createdFirstButtonId = tx.createElement({ tag: "button" });
      const createdSecondButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFirstButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdSecondButtonId });

      return {
        firstButtonId: createdFirstButtonId,
        secondButtonId: createdSecondButtonId,
      };
    });

    bubble.focus(firstButtonId);
    bubble.focus(secondButtonId);

    expect(bubble.getFocusedNodeId()).toBe(secondButtonId);
  });

  test("blur clears focus when one node is active", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });

      return createdButtonId;
    });

    bubble.focus(buttonId);
    bubble.blur();

    expect(bubble.getFocusedNodeId()).toBeNull();
  });

  test("blur is safe when nothing is focused", () => {
    const bubble = createBubble();

    bubble.blur();

    expect(bubble.getFocusedNodeId()).toBeNull();
  });

  test("focus event fires on the focus target", () => {
    const bubble = createBubble();
    const observedEvents: Array<{
      type: string;
      targetId: string;
      currentTargetId: string;
      phase: string;
    }> = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "focus",
        listener: (event) => {
          observedEvents.push({
            type: event.type,
            targetId: event.targetId,
            currentTargetId: event.currentTargetId,
            phase: event.phase,
          });
        },
      });

      return createdButtonId;
    });

    bubble.focus(buttonId);

    expect(observedEvents).toEqual([
      {
        type: "focus",
        targetId: buttonId,
        currentTargetId: buttonId,
        phase: "target",
      },
    ]);
  });

  test("blur event fires on the previous focus target", () => {
    const bubble = createBubble();
    const observedEvents: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "blur",
        listener: (event) => {
          observedEvents.push(`${event.type}:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });

      return createdButtonId;
    });

    bubble.focus(buttonId);
    bubble.blur();

    expect(observedEvents).toEqual([`blur:${buttonId}:${buttonId}:target`]);
  });

  test("switching focus emits blur before focus", () => {
    const bubble = createBubble();
    const observedEvents: string[] = [];

    const { firstButtonId, secondButtonId, parentId } = bubble.transact((tx) => {
      const createdParentId = tx.createElement({ tag: "section" });
      const createdFirstButtonId = tx.createElement({ tag: "button" });
      const createdSecondButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdParentId });
      tx.insertChild({ parentId: createdParentId, childId: createdFirstButtonId });
      tx.insertChild({ parentId: createdParentId, childId: createdSecondButtonId });
      tx.addEventListener({
        nodeId: createdFirstButtonId,
        type: "blur",
        listener: (event) => {
          observedEvents.push(`${event.type}:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });
      tx.addEventListener({
        nodeId: createdSecondButtonId,
        type: "focus",
        listener: (event) => {
          observedEvents.push(`${event.type}:${event.targetId}:${event.currentTargetId}:${event.phase}`);
        },
      });
      tx.addEventListener({
        nodeId: createdParentId,
        type: "focus",
        listener: () => {
          observedEvents.push("parent-focus");
        },
      });
      tx.addEventListener({
        nodeId: createdParentId,
        type: "blur",
        listener: () => {
          observedEvents.push("parent-blur");
        },
      });

      return {
        firstButtonId: createdFirstButtonId,
        secondButtonId: createdSecondButtonId,
        parentId: createdParentId,
      };
    });

    bubble.focus(firstButtonId);
    observedEvents.length = 0;

    bubble.focus(secondButtonId);

    expect(parentId).toBeDefined();
    expect(observedEvents).toEqual([
      `blur:${firstButtonId}:${firstButtonId}:target`,
      `focus:${secondButtonId}:${secondButtonId}:target`,
    ]);
  });

  test("focusing the already focused node is a no-op", () => {
    const bubble = createBubble();
    const observedEvents: string[] = [];

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "focus",
        listener: (event) => {
          observedEvents.push(`${event.type}:${event.targetId}`);
        },
      });
      tx.addEventListener({
        nodeId: createdButtonId,
        type: "blur",
        listener: (event) => {
          observedEvents.push(`${event.type}:${event.targetId}`);
        },
      });

      return createdButtonId;
    });

    bubble.focus(buttonId);
    bubble.focus(buttonId);

    expect(bubble.getFocusedNodeId()).toBe(buttonId);
    expect(observedEvents).toEqual([`focus:${buttonId}`]);
  });

  test("rejects non-focusable targets", () => {
    const bubble = createBubble();

    const { divId, textId } = bubble.transact((tx) => {
      const createdDivId = tx.createElement({ tag: "div" });
      const createdTextId = tx.createText({ value: "Hello" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdDivId });

      return { divId: createdDivId, textId: createdTextId };
    });

    expect(() => {
      bubble.focus(divId);
    }).toThrow(`Node is not focusable: ${divId}`);
    expect(() => {
      bubble.focus(textId);
    }).toThrow(`Only element nodes can receive focus: ${textId}`);
    expect(bubble.getFocusedNodeId()).toBeNull();
  });

  test("rejects focusing an unknown node", () => {
    const bubble = createBubble();

    expect(() => {
      bubble.focus("missing");
    }).toThrow("Unknown node ID: missing");
    expect(bubble.getFocusedNodeId()).toBeNull();
  });

  test("computes tab order in natural DOM order for simple focusable elements", () => {
    const bubble = createBubble();

    const { firstButtonId, inputId, nestedButtonId } = bubble.transact((tx) => {
      const createdFirstButtonId = tx.createElement({ tag: "button" });
      const createdContainerId = tx.createElement({ tag: "section" });
      const createdInputId = tx.createElement({ tag: "input" });
      const createdNestedButtonId = tx.createElement({ tag: "button" });
      const createdTextId = tx.createText({ value: "Ignored text" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFirstButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdContainerId });
      tx.insertChild({ parentId: createdContainerId, childId: createdInputId });
      tx.insertChild({ parentId: createdContainerId, childId: createdTextId, index: 1 });
      tx.insertChild({ parentId: createdContainerId, childId: createdNestedButtonId });

      return {
        firstButtonId: createdFirstButtonId,
        inputId: createdInputId,
        nestedButtonId: createdNestedButtonId,
      };
    });

    expect(bubble.getTabOrder()).toEqual([firstButtonId, inputId, nestedButtonId]);
  });

  test("applies supported tabIndex overrides before natural DOM order", () => {
    const bubble = createBubble();

    const { defaultButtonId, attributeButtonId, propertyInputId, naturalButtonId } = bubble.transact(
      (tx) => {
        const createdDefaultButtonId = tx.createElement({ tag: "button" });
        const createdAttributeButtonId = tx.createElement({ tag: "button" });
        const createdPropertyInputId = tx.createElement({ tag: "input" });
        const createdNaturalButtonId = tx.createElement({ tag: "button" });

        tx.setAttribute({ nodeId: createdAttributeButtonId, name: "tabindex", value: "3" });
        tx.setProperty({ nodeId: createdPropertyInputId, name: "tabIndex", value: 1 });

        tx.insertChild({ parentId: bubble.rootId, childId: createdDefaultButtonId });
        tx.insertChild({ parentId: bubble.rootId, childId: createdAttributeButtonId });
        tx.insertChild({ parentId: bubble.rootId, childId: createdPropertyInputId });
        tx.insertChild({ parentId: bubble.rootId, childId: createdNaturalButtonId });

        return {
          defaultButtonId: createdDefaultButtonId,
          attributeButtonId: createdAttributeButtonId,
          propertyInputId: createdPropertyInputId,
          naturalButtonId: createdNaturalButtonId,
        };
      },
    );

    expect(bubble.getTabOrder()).toEqual([
      propertyInputId,
      attributeButtonId,
      defaultButtonId,
      naturalButtonId,
    ]);
  });

  test("skips disabled elements when computing tab order", () => {
    const bubble = createBubble();

    const { enabledButtonId, enabledInputId } = bubble.transact((tx) => {
      const createdEnabledButtonId = tx.createElement({ tag: "button" });
      const createdDisabledButtonId = tx.createElement({ tag: "button" });
      const createdDisabledInputId = tx.createElement({ tag: "input" });
      const createdEnabledInputId = tx.createElement({ tag: "input" });

      tx.setAttribute({ nodeId: createdDisabledButtonId, name: "disabled", value: "" });
      tx.setProperty({ nodeId: createdDisabledInputId, name: "disabled", value: true });

      tx.insertChild({ parentId: bubble.rootId, childId: createdEnabledButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdDisabledButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdDisabledInputId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdEnabledInputId });

      return {
        enabledButtonId: createdEnabledButtonId,
        enabledInputId: createdEnabledInputId,
      };
    });

    expect(bubble.getTabOrder()).toEqual([enabledButtonId, enabledInputId]);
  });

  test("rejects invalid child mutations", () => {
    const bubble = createBubble();
    const otherBubble = createBubble();

    const otherElementId = otherBubble.transact((tx) => tx.createElement({ tag: "dialog" }));

    bubble.transact((tx) => {
      const elementId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Save" });

      expect(() => {
        tx.insertChild({ parentId: textId, childId: elementId });
      }).toThrow(`Text nodes cannot have children: ${textId}`);
      expect(() => {
        tx.removeChild({ parentId: textId, childId: elementId });
      }).toThrow(`Text nodes cannot have children: ${textId}`);
      expect(() => {
        tx.insertChild({ parentId: bubble.rootId, childId: "missing" });
      }).toThrow("Unknown node ID: missing");
      expect(() => {
        tx.insertChild({ parentId: bubble.rootId, childId: otherElementId });
      }).toThrow(`Unknown node ID: ${otherElementId}`);
      expect(() => {
        tx.insertChild({ parentId: bubble.rootId, childId: elementId, index: -1 });
      }).toThrow("Child index must be an integer within the parent child range");
      expect(() => {
        tx.moveChild({ parentId: textId, childId: elementId, index: 0 });
      }).toThrow(`Text nodes cannot have children: ${textId}`);
      expect(() => {
        tx.moveChild({ parentId: bubble.rootId, childId: "missing", index: 0 });
      }).toThrow("Unknown node ID: missing");
      expect(() => {
        tx.moveChild({ parentId: bubble.rootId, childId: bubble.rootId, index: 0 });
      }).toThrow("The root node cannot be moved as a child");
      expect(() => {
        tx.moveChild({ parentId: bubble.rootId, childId: elementId, index: 0 });
      }).toThrow(`Node ${elementId} is not a child of ${bubble.rootId}`);
      tx.insertChild({ parentId: bubble.rootId, childId: elementId });
      expect(() => {
        tx.moveChild({ parentId: bubble.rootId, childId: elementId, index: -1 });
      }).toThrow("Child index must be an integer within the parent child range");
      expect(() => {
        tx.moveChild({ parentId: bubble.rootId, childId: elementId, index: 1 });
      }).toThrow("Child index must be an integer within the parent child range");
      expect(() => {
        tx.insertChild({ parentId: bubble.rootId, childId: bubble.rootId });
      }).toThrow("The root node cannot be inserted as a child");
      expect(() => {
        tx.removeChild({ parentId: elementId, childId: textId });
      }).toThrow(`Node ${textId} is not a child of ${elementId}`);
      expect(() => {
        tx.removeChild({ parentId: bubble.rootId, childId: bubble.rootId });
      }).toThrow("The root node cannot be removed as a child");
    });
  });

  test("rejects attribute mutations on unsupported node types", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const textId = tx.createText({ value: "Save" });

      expect(() => {
        tx.setAttribute({ nodeId: bubble.rootId, name: "role", value: "application" });
      }).toThrow(`Attributes are only supported on element nodes: ${bubble.rootId}`);
      expect(() => {
        tx.removeAttribute({ nodeId: bubble.rootId, name: "role" });
      }).toThrow(`Attributes are only supported on element nodes: ${bubble.rootId}`);
      expect(() => {
        tx.setAttribute({ nodeId: textId, name: "role", value: "label" });
      }).toThrow(`Attributes are only supported on element nodes: ${textId}`);
      expect(() => {
        tx.removeAttribute({ nodeId: textId, name: "role" });
      }).toThrow(`Attributes are only supported on element nodes: ${textId}`);
    });
  });

  test("rejects property mutations on unsupported node types", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const textId = tx.createText({ value: "Save" });
      const buttonId = tx.createElement({ tag: "button" });

      expect(() => {
        tx.setProperty({ nodeId: bubble.rootId, name: "value", value: "app" });
      }).toThrow(`Properties are only supported on element nodes: ${bubble.rootId}`);
      expect(() => {
        tx.setProperty({ nodeId: textId, name: "value", value: "label" });
      }).toThrow(`Properties are only supported on element nodes: ${textId}`);
      expect(() => {
        tx.setProperty({ nodeId: buttonId, name: "value", value: "label" });
      }).toThrow(`The value property is only supported on text input elements: ${buttonId}`);
      expect(() => {
        tx.setProperty({ nodeId: buttonId, name: "checked", value: true });
      }).toThrow(`The checked property is only supported on checkbox input elements: ${buttonId}`);

      const checkboxId = tx.createElement({ tag: "input" });
      tx.setAttribute({ nodeId: checkboxId, name: "type", value: "checkbox" });

      expect(() => {
        tx.setProperty({ nodeId: checkboxId, name: "checked", value: "yes" });
      }).toThrow("Checked value must be a boolean");
    });
  });

  test("rejects serializing non-form nodes", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => tx.createElement({ tag: "button" }));

    expect(() => {
      bubble.serializeForm(buttonId);
    }).toThrow(`Only html form elements can be serialized: ${buttonId}`);
  });

  test("rejects serializing unknown form nodes", () => {
    const bubble = createBubble();

    expect(() => {
      bubble.serializeForm("missing");
    }).toThrow("Unknown node ID: missing");
  });

  test("rejects submit dispatch on invalid form targets", () => {
    const bubble = createBubble();

    const buttonId = bubble.transact((tx) => tx.createElement({ tag: "button" }));

    expect(() => {
      bubble.dispatchEvent({ type: "submit", targetId: buttonId });
    }).toThrow(`Only html form elements can receive submit events: ${buttonId}`);
  });

  test("rejects submit dispatch on unknown form targets", () => {
    const bubble = createBubble();

    expect(() => {
      bubble.dispatchEvent({ type: "submit", targetId: "missing" });
    }).toThrow("Unknown node ID: missing");
  });

  test("rejects removing a node that is not a child of the parent", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const parentId = tx.createElement({ tag: "article" });
      const actualParentId = tx.createElement({ tag: "section" });
      const childId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: parentId });
      tx.insertChild({ parentId: bubble.rootId, childId: actualParentId });
      tx.insertChild({ parentId: actualParentId, childId: childId });

      expect(() => {
        tx.removeChild({ parentId, childId });
      }).toThrow(`Node ${childId} is not a child of ${parentId}`);
    });
  });

  test("rejects moving a node that is not a child of the parent", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const parentId = tx.createElement({ tag: "article" });
      const actualParentId = tx.createElement({ tag: "section" });
      const childId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: parentId });
      tx.insertChild({ parentId: bubble.rootId, childId: actualParentId });
      tx.insertChild({ parentId: actualParentId, childId: childId });

      expect(() => {
        tx.moveChild({ parentId, childId, index: 0 });
      }).toThrow(`Node ${childId} is not a child of ${parentId}`);
    });
  });
});
