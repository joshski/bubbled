import { describe, expect, test } from "bun:test";

import { createController } from "./index";

describe("createController", () => {
  test("creates a session with an inspectable bubble instance", async () => {
    const controller = await createController();

    const session = await controller.createSession();

    expect(session.id).toBe("session-1");
    expect(await controller.getSession(session.id)).toBe(session);
    expect(session.inspect()).toMatchObject({
      rootId: "root",
    });
    expect(Array.from(session.inspect().nodes.keys())).toEqual(["root"]);
  });

  test("resets a session to a fresh bubble instance", async () => {
    const controller = await createController();
    const session = await controller.createSession();
    const snapshotBeforeReset = session.inspect();

    await session.reset();

    const snapshotAfterReset = session.inspect();

    expect(snapshotAfterReset).toMatchObject({
      rootId: "root",
    });
    expect(Array.from(snapshotAfterReset.nodes.keys())).toEqual(["root"]);
    expect(snapshotAfterReset).not.toBe(snapshotBeforeReset);
    expect(snapshotAfterReset.nodes).not.toBe(snapshotBeforeReset.nodes);
  });

  test("destroys a session and rejects further use", async () => {
    const controller = await createController();
    const session = await controller.createSession();

    await session.destroy();

    expect(() => session.inspect()).toThrow({
      code: "session_destroyed",
      message: `Session ${session.id} has been destroyed.`,
    });
    await expect(session.reset()).rejects.toMatchObject({
      code: "session_destroyed",
      message: `Session ${session.id} has been destroyed.`,
    });
    await expect(session.destroy()).rejects.toMatchObject({
      code: "session_destroyed",
      message: `Session ${session.id} has been destroyed.`,
    });
  });
});
