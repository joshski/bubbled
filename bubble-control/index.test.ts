import { describe, expect, test } from "bun:test";

import { createController } from "./index";

describe("createController", () => {
  test("creates a session that can be discovered by ID", async () => {
    const controller = await createController();

    const session = await controller.createSession();
    const tree = await session.query({ type: "get-tree" });

    expect(session.id).toBe("session-1");
    expect(await controller.getSession(session.id)).toBe(session);
    expect(tree).toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: "root",
      }),
    });
    expect(await controller.getSession("missing")).toBeNull();
  });

  test("command mutates session state", async () => {
    const controller = await createController();
    const session = await controller.createSession();
    const destroyResult = await session.command({ type: "destroy" });

    expect(destroyResult).toEqual({ ok: true });
    await expect(session.query({ type: "get-tree" })).resolves.toEqual({
      ok: false,
      error: {
        code: "session_destroyed",
        message: `Session ${session.id} has been destroyed.`,
      },
    });
  });

  test("reset command returns an explicit success result", async () => {
    const controller = await createController();
    const session = await controller.createSession();

    expect(await session.command({ type: "reset" })).toEqual({ ok: true });
    await expect(session.query({ type: "get-tree" })).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: "root",
      }),
    });
  });

  test("query reads state without mutation", async () => {
    const controller = await createController();
    const session = await controller.createSession();

    const firstResult = await session.query({ type: "get-tree" });
    const secondResult = await session.query({ type: "get-tree" });

    expect(firstResult).toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: "root",
      }),
    });
    expect(secondResult).toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: "root",
      }),
    });
    expect(firstResult).not.toBe(secondResult);
    if (firstResult.ok && secondResult.ok) {
      expect(Array.from(firstResult.value.nodes.keys())).toEqual(["root"]);
      expect(Array.from(secondResult.value.nodes.keys())).toEqual(["root"]);
      expect(firstResult.value).not.toBe(secondResult.value);
      expect(firstResult.value.nodes).not.toBe(secondResult.value.nodes);
    }
  });

  test("invalid command returns a structured error", async () => {
    const controller = await createController();
    const session = await controller.createSession();

    const result = await session.command({ type: "explode" } as never);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "unknown_command",
        message: "Unknown command: explode",
        details: {
          type: "explode",
        },
      },
    });
  });

  test("invalid query returns a structured error", async () => {
    const controller = await createController();
    const session = await controller.createSession();

    const result = await session.query({ type: "explode" } as never);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "unknown_query",
        message: "Unknown query: explode",
        details: {
          type: "explode",
        },
      },
    });
  });

  test("reset and destroy wrappers forward structured errors after destruction", async () => {
    const controller = await createController();
    const session = await controller.createSession();

    await session.destroy();

    await expect(session.reset()).rejects.toEqual({
      code: "session_destroyed",
      message: `Session ${session.id} has been destroyed.`,
    });
    await expect(session.destroy()).rejects.toEqual({
      code: "session_destroyed",
      message: `Session ${session.id} has been destroyed.`,
    });
  });
});
