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

  const { elementId, textId, replacementTextId, svgElementId, movedElementId } = bubble.transact((tx) => {
    const createdElementId = tx.createElement({ tag: "button" });
    const createdTextId = tx.createText({ value: "Save" });
    const createdSvgElementId = tx.createElement({ tag: "circle", namespace: "svg" });
    const createdMovedElementId = tx.createElement({ tag: "aside" });

    tx.insertChild({ parentId: bubble.rootId, childId: createdElementId });
    tx.insertChild({ parentId: createdElementId, childId: createdTextId });
    tx.insertChild({ parentId: bubble.rootId, childId: createdSvgElementId });
    tx.insertChild({ parentId: bubble.rootId, childId: createdMovedElementId });
    tx.moveChild({ parentId: bubble.rootId, childId: createdMovedElementId, index: 1 });

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
    expect(() => {
      tx.moveChild({ parentId: bubble.rootId, childId: bubble.rootId, index: 0 });
    }).toThrow("The root node cannot be moved as a child");
    expect(() => {
      tx.createElement({ tag: "" });
    }).toThrow("Element tag must be a non-empty string");

    tx.removeChild({ parentId: createdElementId, childId: createdTextId });
    tx.removeChild({ parentId: bubble.rootId, childId: createdElementId });

    expect(() => {
      tx.removeChild({ parentId: bubble.rootId, childId: createdElementId });
    }).toThrow(`Node ${createdElementId} is not a child of ${bubble.rootId}`);

    return {
      elementId: createdElementId,
      textId: createdTextId,
      replacementTextId: tx.createText({ value: "Later" }),
      svgElementId: createdSvgElementId,
      movedElementId: createdMovedElementId,
    };
  });

  expect(elementId).toMatch(/^node:\d+:1$/);
  expect(textId).toMatch(/^node:\d+:2$/);
  expect(svgElementId).toMatch(/^node:\d+:3$/);
  expect(movedElementId).toMatch(/^node:\d+:4$/);
  expect(replacementTextId).toMatch(/^node:\d+:5$/);
  expect(bubble.getRoot()).toEqual({
    id: "root",
    kind: "root",
    children: [movedElementId, svgElementId],
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
  expect(bubble.getNode(textId)).toEqual({
    id: textId,
    kind: "text",
    parentId: null,
    value: "Save",
  });
  expect(bubble.getNode(svgElementId)).toEqual({
    id: svgElementId,
    kind: "element",
    tag: "circle",
    namespace: "svg",
    parentId: bubble.rootId,
    children: [],
    attributes: {},
    properties: {},
  });
  expect(bubble.getNode(movedElementId)).toEqual({
    id: movedElementId,
    kind: "element",
    tag: "aside",
    namespace: "html",
    parentId: bubble.rootId,
    children: [],
    attributes: {},
    properties: {},
  });
  expect(bubble.getNode(replacementTextId)).toEqual({
    id: replacementTextId,
    kind: "text",
    parentId: null,
    value: "Later",
  });
});
