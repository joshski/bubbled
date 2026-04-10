import { describe, expect, test } from "bun:test";

import { createBubble } from "./index";

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

      expect(() => {
        tx.setProperty({ nodeId: bubble.rootId, name: "value", value: "app" });
      }).toThrow(`Properties are only supported on element nodes: ${bubble.rootId}`);
      expect(() => {
        tx.setProperty({ nodeId: textId, name: "value", value: "label" });
      }).toThrow(`Properties are only supported on element nodes: ${textId}`);
    });
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
