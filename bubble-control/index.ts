import { createBubble, type BubbleSnapshot } from "../bubble-core";

export interface BubbleControlError {
  readonly code: string;
  readonly message: string;
}

export interface BubbleSession {
  readonly id: string;
  inspect(): BubbleSnapshot;
  reset(): Promise<void>;
  destroy(): Promise<void>;
}

export interface BubbleController {
  createSession(): Promise<BubbleSession>;
  getSession(id: string): Promise<BubbleSession | null>;
}

export function createController(): Promise<BubbleController> {
  let nextSessionId = 0;
  const sessions = new Map<string, BubbleSession>();

  return Promise.resolve({
    async createSession() {
      nextSessionId += 1;

      let destroyed = false;
      let bubble = createBubble();
      const id = `session-${nextSessionId}`;

      const session: BubbleSession = {
        id,
        inspect() {
          if (destroyed) {
            throw {
              code: "session_destroyed",
              message: `Session ${id} has been destroyed.`,
            } satisfies BubbleControlError;
          }

          return bubble.snapshot();
        },
        async reset() {
          session.inspect();
          bubble = createBubble();
        },
        async destroy() {
          session.inspect();
          destroyed = true;
        },
      };

      sessions.set(id, session);

      return session;
    },
    async getSession(id: string) {
      return sessions.get(id) ?? null;
    },
  });
}
