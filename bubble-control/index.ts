import {
  createBubble,
  type BubbleRuntime,
  type BubbleRuntimeEvent,
  type BubbleSnapshot,
} from '../bubble-core'

export interface BubbleControlError {
  readonly code: string
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}

export type BubbleSessionEvent =
  | { readonly type: 'runtime'; readonly event: BubbleRuntimeEvent }
  | { readonly type: 'session-error'; readonly error: BubbleControlError }

export type BubbleCommand =
  | { readonly type: 'reset' }
  | { readonly type: 'destroy' }

export type BubbleCommandResult =
  | { readonly ok: true; readonly value?: undefined }
  | { readonly ok: false; readonly error: BubbleControlError }

export type BubbleQuery = { readonly type: 'get-tree' }

export type BubbleQueryResult =
  | { readonly ok: true; readonly value: BubbleSnapshot }
  | { readonly ok: false; readonly error: BubbleControlError }

export interface BubbleSession {
  readonly id: string
  command(input: BubbleCommand): Promise<BubbleCommandResult>
  query(input: BubbleQuery): Promise<BubbleQueryResult>
  reset(): Promise<void>
  destroy(): Promise<void>
  subscribe(listener: (event: BubbleSessionEvent) => void): () => void
}

export interface BubbleController {
  createSession(): Promise<BubbleSession>
  getSession(id: string): Promise<BubbleSession | null>
}

export interface CreateControllerOptions {
  readonly createBubble?: () => BubbleRuntime
}

export function createController(
  options: CreateControllerOptions = {}
): Promise<BubbleController> {
  const createRuntime = options.createBubble ?? createBubble
  let nextSessionId = 0
  const sessions = new Map<string, BubbleSession>()

  return Promise.resolve({
    async createSession() {
      nextSessionId += 1

      let destroyed = false
      const subscribers = new Set<(event: BubbleSessionEvent) => void>()
      let bubble = createRuntime()
      const id = `session-${nextSessionId}`

      const createSessionDestroyedError = (): BubbleControlError => ({
        code: 'session_destroyed',
        message: `Session ${id} has been destroyed.`,
      })

      const emit = (event: BubbleSessionEvent): void => {
        for (const listener of subscribers) {
          try {
            listener(event)
          } catch {
            // Keep subscriber failures isolated so other subscribers still receive records.
          }
        }
      }

      const subscribeToRuntime = (runtime: BubbleRuntime): (() => void) =>
        runtime.subscribe(event => {
          emit({
            type: 'runtime',
            event,
          })
        })

      let unsubscribeFromRuntime = subscribeToRuntime(bubble)

      const replaceBubble = (nextBubble: BubbleRuntime): void => {
        unsubscribeFromRuntime()
        bubble = nextBubble
        unsubscribeFromRuntime = subscribeToRuntime(nextBubble)
      }

      const fail = (error: BubbleControlError) => {
        emit({
          type: 'session-error',
          error,
        })

        return {
          ok: false as const,
          error,
        }
      }

      const requireActiveSession = (): BubbleControlError | null => {
        if (destroyed) {
          return createSessionDestroyedError()
        }

        return null
      }

      const session: BubbleSession = {
        id,
        async command(input) {
          const sessionError = requireActiveSession()

          if (sessionError !== null) {
            return fail(sessionError)
          }

          switch (input.type) {
            case 'reset':
              replaceBubble(createRuntime())

              return {
                ok: true,
              }
            case 'destroy':
              destroyed = true
              unsubscribeFromRuntime()
              sessions.delete(id)

              return {
                ok: true,
              }
            default: {
              const invalidCommand = input as { type: string }

              return fail({
                code: 'unknown_command',
                message: `Unknown command: ${invalidCommand.type}`,
                details: { type: invalidCommand.type },
              })
            }
          }
        },
        async query(input) {
          const sessionError = requireActiveSession()

          if (sessionError !== null) {
            return fail(sessionError)
          }

          switch (input.type) {
            case 'get-tree':
              return {
                ok: true,
                value: bubble.snapshot(),
              }
            default: {
              const invalidQuery = input as { type: string }

              return fail({
                code: 'unknown_query',
                message: `Unknown query: ${invalidQuery.type}`,
                details: { type: invalidQuery.type },
              })
            }
          }
        },
        async reset() {
          const result = await session.command({ type: 'reset' })

          /* istanbul ignore next -- wrapper mirrors the already-covered command error path. */
          if (!result.ok) {
            throw result.error
          }
        },
        async destroy() {
          const result = await session.command({ type: 'destroy' })

          if (!result.ok) {
            throw result.error
          }
        },
        subscribe(listener) {
          subscribers.add(listener)

          return () => {
            subscribers.delete(listener)
          }
        },
      }

      sessions.set(id, session)

      return session
    },
    async getSession(id: string) {
      return sessions.get(id) ?? null
    },
  })
}
