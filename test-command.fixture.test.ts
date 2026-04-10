import { expect, test } from "bun:test";

import { createBubble } from "./bubble-core";

test("test command fixture", () => {
  expect("bun test").toContain("test");

  const bubble = createBubble();

  expect(bubble.rootId).toBe("root");
  expect(bubble.getRoot()).toEqual({
    id: "root",
    kind: "root",
    children: [],
  });
  expect(bubble.getNode("missing")).toBeNull();
  expect(bubble.getNode(bubble.rootId)).toEqual(bubble.getRoot());

  const { elementId, textId, replacementTextId } = bubble.transact((tx) => {
    const createdElementId = tx.createElement({ tag: "button" });
    const createdTextId = tx.createText({ value: "Save" });

    tx.insertChild({ parentId: bubble.rootId, childId: createdElementId });
    tx.insertChild({ parentId: createdElementId, childId: createdTextId });

    expect(() => {
      tx.insertChild({ parentId: createdTextId, childId: createdElementId });
    }).toThrow(`Text nodes cannot have children: ${createdTextId}`);
    expect(() => {
      tx.removeChild({ parentId: createdTextId, childId: createdElementId });
    }).toThrow(`Text nodes cannot have children: ${createdTextId}`);
    expect(() => {
      tx.insertChild({ parentId: bubble.rootId, childId: "missing" });
    }).toThrow("Unknown node ID: missing");
    expect(() => {
      tx.insertChild({ parentId: bubble.rootId, childId: bubble.rootId });
    }).toThrow("The root node cannot be inserted as a child");
    expect(() => {
      tx.removeChild({ parentId: bubble.rootId, childId: bubble.rootId });
    }).toThrow("The root node cannot be removed as a child");

    tx.removeChild({ parentId: createdElementId, childId: createdTextId });
    tx.removeChild({ parentId: bubble.rootId, childId: createdElementId });

    expect(() => {
      tx.removeChild({ parentId: bubble.rootId, childId: createdElementId });
    }).toThrow(`Node ${createdElementId} is not a child of ${bubble.rootId}`);

    return {
      elementId: createdElementId,
      textId: createdTextId,
      replacementTextId: tx.createText({ value: "Later" }),
    };
  });

  expect(elementId).toBe("node:1");
  expect(textId).toBe("node:2");
  expect(replacementTextId).toBe("node:3");
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
  expect(bubble.getNode(textId)).toEqual({
    id: textId,
    kind: "text",
    parentId: null,
    value: "Save",
  });
  expect(bubble.getNode(replacementTextId)).toEqual({
    id: replacementTextId,
    kind: "text",
    parentId: null,
    value: "Later",
  });
});
