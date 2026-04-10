import { describe, expect, test } from "bun:test";

import { createBubble } from "../bubble-core";
import { createHarness } from "./index";

describe("createHarness", () => {
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
