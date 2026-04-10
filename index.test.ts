import { describe, expect, test } from "bun:test";

const entrypoints = [
  "./index",
  "./bubble-core",
  "./bubble-capabilities",
  "./bubble-test",
  "./bubble-browser",
  "./bubble-react",
  "./bubble-control",
  "./bubble-cli",
] as const;

describe("public entrypoints", () => {
  for (const entrypointPath of entrypoints) {
    test(`${entrypointPath} imports without side effects`, async () => {
      const globalsBeforeImport = Object.getOwnPropertyDescriptors(globalThis);

      const entrypoint = await import(entrypointPath);

      expect(entrypoint).toEqual({});
      expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(globalsBeforeImport);
    });
  }
});
