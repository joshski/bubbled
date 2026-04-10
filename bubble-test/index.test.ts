import { describe, expect, test } from "bun:test";

import { createBubble } from "../bubble-core";
import { createHarness } from "./index";

describe("createHarness", () => {
  test("renders root content through the harness helper", () => {
    const harness = createHarness();

    harness.render({
      tag: "button",
      attributes: { type: "button" },
      children: ["Save"],
    });

    const buttonId = harness.getByRole("button", { name: "Save" });
    const button = harness.bubble.getNode(buttonId);
    const textId = harness.bubble.getRoot().children.length === 1 && button?.kind === "element" ? button.children[0] : null;

    expect(harness.bubble.getRoot().children).toEqual([buttonId]);
    expect(button?.id).toBe(buttonId);
    expect(button?.kind).toBe("element");
    if (button?.kind === "element") {
      expect(button.tag).toBe("button");
      expect(button.namespace).toBe("html");
      expect(button.parentId).toBe(harness.bubble.rootId);
      expect(button.children).toEqual([textId]);
      expect(button.attributes).toEqual({ type: "button" });
      expect(button.properties).toEqual({});
      expect(button.value).toBeNull();
      expect(button.checked).toBeNull();
      expect(button.role).toBe("button");
      expect(button.name).toBe("Save");
    }
    expect(textId).not.toBeNull();
    expect(harness.bubble.getNode(textId as string)).toEqual({
      id: textId,
      kind: "text",
      parentId: buttonId,
      value: "Save",
    });
  });

  test("re-renders compatible content by updating the existing nodes in place", () => {
    const harness = createHarness();

    harness.render("first");

    const firstTextId = harness.bubble.getRoot().children[0];
    const bubbleBeforeRerender = harness.bubble;

    harness.render("second");

    expect(harness.bubble).toBe(bubbleBeforeRerender);
    expect(harness.bubble.getRoot().children).toEqual([firstTextId]);
    expect(harness.bubble.getNode(firstTextId)).toEqual({
      id: firstTextId,
      kind: "text",
      parentId: harness.bubble.rootId,
      value: "second",
    });
  });

  test("re-renders compatible element trees by updating attributes, properties, and children", () => {
    const harness = createHarness();

    harness.render({
      tag: "section",
      attributes: { "data-state": "draft" },
      children: [
        { tag: "button", attributes: { type: "button" }, children: ["Save"] },
      ],
    });

    const sectionId = harness.bubble.getRoot().children[0];
    const buttonId = harness.getByRole("button", { name: "Save" });

    harness.render({
      tag: "section",
      attributes: { "aria-label": "Editor" },
      children: [
        { tag: "button", attributes: { type: "button" }, children: ["Publish"] },
        { tag: "input", attributes: { type: "text", "aria-label": "Title" }, properties: { value: "Draft" } },
      ],
    });

    expect(harness.bubble.getRoot().children).toEqual([sectionId]);
    expect(harness.getByRole("button", { name: "Publish" })).toBe(buttonId);
    const textboxId = harness.getByRole("textbox", { name: "Title" });
    const section = harness.bubble.getNode(sectionId);

    expect(section?.id).toBe(sectionId);
    expect(section?.kind).toBe("element");
    if (section?.kind === "element") {
      expect(section.tag).toBe("section");
      expect(section.namespace).toBe("html");
      expect(section.parentId).toBe(harness.bubble.rootId);
      expect(section.children).toEqual([buttonId, textboxId]);
      expect(section.attributes).toEqual({ "aria-label": "Editor" });
      expect(section.properties).toEqual({});
      expect(section.value).toBeNull();
      expect(section.checked).toBeNull();
      expect(section.role).toBeNull();
      expect(section.name).toBe("Editor");
    }

    const textbox = harness.bubble.getNode(textboxId);

    expect(textbox?.id).toBe(textboxId);
    expect(textbox?.kind).toBe("element");
    if (textbox?.kind === "element") {
      expect(textbox.tag).toBe("input");
      expect(textbox.namespace).toBe("html");
      expect(textbox.parentId).toBe(sectionId);
      expect(textbox.children).toEqual([]);
      expect(textbox.attributes).toEqual({ type: "text", "aria-label": "Title" });
      expect(textbox.properties).toEqual({ value: "Draft" });
      expect(textbox.value).toBe("Draft");
      expect(textbox.checked).toBeNull();
      expect(textbox.role).toBe("textbox");
      expect(textbox.name).toBe("Title");
    }

    harness.render({
      tag: "section",
      attributes: { "aria-label": "Editor" },
      children: [
        { tag: "button", attributes: { type: "button" }, children: ["Publish"] },
        { tag: "input", attributes: { type: "text", "aria-label": "Title" }, properties: { value: "Published" } },
      ],
    });

    expect(harness.getByRole("textbox", { name: "Title" })).toBe(textboxId);
    const updatedTextbox = harness.bubble.getNode(textboxId);

    expect(updatedTextbox?.id).toBe(textboxId);
    expect(updatedTextbox?.kind).toBe("element");
    if (updatedTextbox?.kind === "element") {
      expect(updatedTextbox.tag).toBe("input");
      expect(updatedTextbox.namespace).toBe("html");
      expect(updatedTextbox.parentId).toBe(sectionId);
      expect(updatedTextbox.children).toEqual([]);
      expect(updatedTextbox.attributes).toEqual({ type: "text", "aria-label": "Title" });
      expect(updatedTextbox.properties).toEqual({ value: "Published" });
      expect(updatedTextbox.value).toBe("Published");
      expect(updatedTextbox.checked).toBeNull();
      expect(updatedTextbox.role).toBe("textbox");
      expect(updatedTextbox.name).toBe("Title");
    }

    harness.render({
      tag: "section",
      attributes: { "aria-label": "Editor" },
      children: [{ tag: "button", attributes: { type: "button" }, children: ["Publish"] }],
    });

    expect(harness.bubble.getNode(sectionId)).toMatchObject({
      id: sectionId,
      kind: "element",
      children: [buttonId],
    });
  });

  test("re-renders incompatible content by replacing nodes and trimming removed roots", () => {
    const harness = createHarness();

    harness.render([
      { tag: "button", children: ["Save"] },
      { tag: "button", children: ["Cancel"] },
    ]);

    const [saveButtonId, cancelButtonId] = harness.bubble.getRoot().children;

    harness.render("Done");

    const [textId] = harness.bubble.getRoot().children;

    expect(harness.bubble.getRoot().children).toEqual([textId]);
    expect(textId).not.toBe(saveButtonId);
    expect(textId).not.toBe(cancelButtonId);
    expect(harness.bubble.getNode(textId)).toEqual({
      id: textId,
      kind: "text",
      parentId: harness.bubble.rootId,
      value: "Done",
    });
  });

  test("re-renders incompatible element content by replacing the previous root node", () => {
    const harness = createHarness();

    harness.render({ tag: "button", children: ["Save"] });

    const previousRootChildId = harness.bubble.getRoot().children[0];

    harness.render({ tag: "section", children: ["Saved"] });

    const nextRootChildId = harness.bubble.getRoot().children[0];

    expect(nextRootChildId).not.toBe(previousRootChildId);
    expect(harness.bubble.getNode(nextRootChildId)).toMatchObject({
      id: nextRootChildId,
      kind: "element",
      tag: "section",
      parentId: harness.bubble.rootId,
    });
  });

  test("cleanup resets harness state", () => {
    const harness = createHarness();

    harness.render({
      tag: "button",
      children: ["Save"],
    });
    harness.tab();

    const bubbleBeforeCleanup = harness.bubble;

    harness.cleanup();

    expect(harness.bubble).not.toBe(bubbleBeforeCleanup);
    expect(harness.bubble.getRoot()).toEqual({
      id: "root",
      kind: "root",
      children: [],
    });
    expect(harness.bubble.getFocusedNodeId()).toBeNull();
    expect(() => harness.getByRole("button")).toThrow(
      'Unable to find a node with role "button". No nodes with that role exist in the current bubble snapshot.',
    );
  });

  test("finds nodes by role only", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    const buttonId = bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      return createdButtonId;
    });

    expect(harness.getByRole("button")).toBe(buttonId);
  });

  test("finds nodes by role and accessible name", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    const saveButtonId = bubble.transact((tx) => {
      const createdCancelButtonId = tx.createElement({ tag: "button" });
      const cancelTextId = tx.createText({ value: "Cancel" });
      const createdSaveButtonId = tx.createElement({ tag: "button" });
      const saveTextId = tx.createText({ value: "Save" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdCancelButtonId });
      tx.insertChild({ parentId: createdCancelButtonId, childId: cancelTextId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdSaveButtonId });
      tx.insertChild({ parentId: createdSaveButtonId, childId: saveTextId });

      return createdSaveButtonId;
    });

    expect(harness.getByRole("button", { name: "Save" })).toBe(saveButtonId);
  });

  test("finds nodes by role and accessible name pattern", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    const saveButtonId = bubble.transact((tx) => {
      const createdSaveButtonId = tx.createElement({ tag: "button" });
      const saveTextId = tx.createText({ value: "Save draft" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdSaveButtonId });
      tx.insertChild({ parentId: createdSaveButtonId, childId: saveTextId });

      return createdSaveButtonId;
    });

    expect(harness.getByRole("button", { name: /^Save/ })).toBe(saveButtonId);
  });

  test("reports clear output when a semantic query misses", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    bubble.transact((tx) => {
      const createdButtonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Cancel" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId });
      tx.insertChild({ parentId: createdButtonId, childId: textId });
    });

    expect(() => harness.getByRole("button", { name: "Save" })).toThrow(
      'Unable to find a node with role "button" and name "Save". Nodes with role "button": node:',
    );
    expect(() => harness.getByRole("button", { name: "Save" })).toThrow('("Cancel")');
  });

  test("advances focus forward in tab order", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    const { firstButtonId, inputId, nestedButtonId } = bubble.transact((tx) => {
      const createdFirstButtonId = tx.createElement({ tag: "button" });
      const createdContainerId = tx.createElement({ tag: "section" });
      const createdInputId = tx.createElement({ tag: "input" });
      const createdNestedButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFirstButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdContainerId });
      tx.insertChild({ parentId: createdContainerId, childId: createdInputId });
      tx.insertChild({ parentId: createdContainerId, childId: createdNestedButtonId });

      return {
        firstButtonId: createdFirstButtonId,
        inputId: createdInputId,
        nestedButtonId: createdNestedButtonId,
      };
    });

    harness.tab();
    expect(bubble.getFocusedNodeId()).toBe(firstButtonId);

    harness.tab();
    expect(bubble.getFocusedNodeId()).toBe(inputId);

    harness.tab();
    expect(bubble.getFocusedNodeId()).toBe(nestedButtonId);
  });

  test("stops at the end of the tab order", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

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

    harness.tab();
    harness.tab();
    harness.tab();

    expect(firstButtonId).toBeDefined();
    expect(bubble.getFocusedNodeId()).toBe(secondButtonId);
  });

  test("moves focus backward with Shift+Tab and stops at the start", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    const { firstButtonId, secondButtonId, thirdButtonId } = bubble.transact((tx) => {
      const createdFirstButtonId = tx.createElement({ tag: "button" });
      const createdSecondButtonId = tx.createElement({ tag: "button" });
      const createdThirdButtonId = tx.createElement({ tag: "button" });

      tx.insertChild({ parentId: bubble.rootId, childId: createdFirstButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdSecondButtonId });
      tx.insertChild({ parentId: bubble.rootId, childId: createdThirdButtonId });

      return {
        firstButtonId: createdFirstButtonId,
        secondButtonId: createdSecondButtonId,
        thirdButtonId: createdThirdButtonId,
      };
    });

    harness.tab({ shift: true });
    expect(bubble.getFocusedNodeId()).toBe(thirdButtonId);

    harness.tab({ shift: true });
    expect(bubble.getFocusedNodeId()).toBe(secondButtonId);

    harness.tab({ shift: true });
    expect(bubble.getFocusedNodeId()).toBe(firstButtonId);

    harness.tab({ shift: true });
    expect(bubble.getFocusedNodeId()).toBe(firstButtonId);
  });

  test("is a no-op when no tabbable elements exist", () => {
    const bubble = createBubble();
    const harness = createHarness(bubble);

    bubble.transact((tx) => {
      const containerId = tx.createElement({ tag: "section" });
      tx.insertChild({ parentId: bubble.rootId, childId: containerId });
    });

    harness.tab();
    harness.tab({ shift: true });

    expect(bubble.getFocusedNodeId()).toBeNull();
  });
});
