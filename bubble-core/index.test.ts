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
        tx.insertChild({ parentId: bubble.rootId, childId: bubble.rootId });
      }).toThrow("The root node cannot be inserted as a child");
      expect(() => {
        tx.removeChild({ parentId: bubble.rootId, childId: elementId });
      }).toThrow(`Node ${elementId} is not a child of ${bubble.rootId}`);
      expect(() => {
        tx.removeChild({ parentId: bubble.rootId, childId: bubble.rootId });
      }).toThrow("The root node cannot be removed as a child");
    });
  });
});
