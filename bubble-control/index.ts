import { createBubble, type BubbleSnapshot } from "../bubble-core";

export interface BubbleControlError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type BubbleCommand = { readonly type: "reset" } | { readonly type: "destroy" };

export type BubbleCommandResult =
  | { readonly ok: true; readonly value?: undefined }
  | { readonly ok: false; readonly error: BubbleControlError };

export type BubbleQuery = { readonly type: "get-tree" };

export type BubbleQueryResult =
  | { readonly ok: true; readonly value: BubbleSnapshot }
  | { readonly ok: false; readonly error: BubbleControlError };

export interface BubbleSession {
  readonly id: string;
  command(input: BubbleCommand): Promise<BubbleCommandResult>;
  query(input: BubbleQuery): Promise<BubbleQueryResult>;
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

      const createSessionDestroyedError = (): BubbleControlError => ({
        code: "session_destroyed",
        message: `Session ${id} has been destroyed.`,
      });

      const requireActiveSession = (): BubbleControlError | null => {
        if (destroyed) {
          return createSessionDestroyedError();
        }

        return null;
      };

      const session: BubbleSession = {
        id,
        async command(input) {
          const sessionError = requireActiveSession();

          if (sessionError !== null) {
            return {
              ok: false,
              error: sessionError,
            };
          }

          switch (input.type) {
            case "reset":
              bubble = createBubble();

              return {
                ok: true,
              };
            case "destroy":
              destroyed = true;

              return {
                ok: true,
              };
            default:
              {
                const invalidCommand = input as { type: string };

                return {
                  ok: false,
                  error: {
                    code: "unknown_command",
                    message: `Unknown command: ${invalidCommand.type}`,
                    details: { type: invalidCommand.type },
                  },
                };
              }
          }
        },
        async query(input) {
          const sessionError = requireActiveSession();

          if (sessionError !== null) {
            return {
              ok: false,
              error: sessionError,
            };
          }

          switch (input.type) {
            case "get-tree":
              return {
                ok: true,
                value: bubble.snapshot(),
              };
            default:
              {
                const invalidQuery = input as { type: string };

                return {
                  ok: false,
                  error: {
                    code: "unknown_query",
                    message: `Unknown query: ${invalidQuery.type}`,
                    details: { type: invalidQuery.type },
                  },
                };
              }
          }
        },
        async reset() {
          const result = await session.command({ type: "reset" });

          if (!result.ok) {
            throw result.error;
          }
        },
        async destroy() {
          const result = await session.command({ type: "destroy" });

          if (!result.ok) {
            throw result.error;
          }
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
