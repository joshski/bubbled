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
});
