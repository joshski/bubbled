import { describe, expect, test } from "bun:test";

const emptyEntrypoints = [
  "./index",
  "./bubble-capabilities",
  "./bubble-browser",
  "./bubble-react",
  "./bubble-control",
  "./bubble-cli",
] as const;

describe("public entrypoints", () => {
  test("./bubble-core exposes the bubble runtime entrypoint", async () => {
    const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

    const entrypoint = await import("./bubble-core");

    expect(entrypoint).toEqual({
      createBubble: expect.any(Function),
      createBubbleQuery: expect.any(Function),
    });
    expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
  });

  test("./bubble-test exposes the test harness entrypoint", async () => {
    const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

    const entrypoint = await import("./bubble-test");

    expect(entrypoint).toEqual({
      createHarness: expect.any(Function),
    });
    expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
  });

  for (const entrypointPath of emptyEntrypoints) {
    test(`${entrypointPath} imports without side effects`, async () => {
      const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

      const entrypoint = await import(entrypointPath);

      expect(entrypoint).toEqual({});
      expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
    });
  }
});
