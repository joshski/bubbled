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

    const firstRoot = firstBubble.getRoot();
    const secondRoot = secondBubble.getRoot();

    expect(firstRoot).toEqual(secondRoot);
    expect(firstRoot).not.toBe(secondRoot);
    expect(firstRoot.children).not.toBe(secondRoot.children);
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
});
