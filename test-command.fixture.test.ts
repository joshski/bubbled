import { expect, test } from "bun:test";

test("test command fixture", () => {
  expect("bun test").toContain("test");
});

