import { expect, test } from "bun:test";

test("entrypoint imports without side effects", async () => {
  const entrypoint = await import("./index");

  expect(entrypoint).toEqual({});
});

