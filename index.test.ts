import { describe, expect, test } from "bun:test";

const emptyEntrypoints = [
  "./index",
  "./bubble-capabilities",
  "./bubble-browser",
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
      serializeBubbleSnapshot: expect.any(Function),
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

  test("./bubble-browser exposes the DOM projector entrypoint", async () => {
    const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

    const entrypoint = await import("./bubble-browser");

    expect(entrypoint).toEqual({
      createDomProjector: expect.any(Function),
    });
    expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
  });

  test("./bubble-react exposes the React adapter entrypoint", async () => {
    const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

    const entrypoint = await import("./bubble-react");

    expect(entrypoint).toEqual({
      createBubbleReactRoot: expect.any(Function),
    });
    expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
  });

  test("./bubble-control exposes the control entrypoint", async () => {
    const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

    const entrypoint = await import("./bubble-control");

    expect(entrypoint).toEqual({
      createController: expect.any(Function),
    });
    expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
  });

  for (const entrypointPath of emptyEntrypoints) {
    if (
      entrypointPath === "./bubble-capabilities" ||
      entrypointPath === "./bubble-browser" ||
      entrypointPath === "./bubble-control"
    ) {
      continue;
    }

    test(`${entrypointPath} imports without side effects`, async () => {
      const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

      const entrypoint = await import(entrypointPath);

      expect(entrypoint).toEqual({});
      expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
    });
  }

  test("./bubble-capabilities exposes the capability registry entrypoint", async () => {
    const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

    const entrypoint = await import("./bubble-capabilities");

    expect(entrypoint).toEqual({
      BubbleUnsupportedCapabilityError: expect.any(Function),
      createCapabilityRegistry: expect.any(Function),
    });
    expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
  });
});
