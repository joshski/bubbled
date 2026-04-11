import { describe, expect, test } from 'vitest'

import type {
  BubbleCommand,
  BubbleCommandResult,
  BubbleController,
  BubbleQuery,
  BubbleQueryResult,
} from '../bubble-control'

import { createBubble } from '../bubble-core'
import { main } from './index'

function createWriter() {
  const chunks: string[] = []

  return {
    writer: {
      write(chunk: string) {
        chunks.push(chunk)
      },
    },
    toString() {
      return chunks.join('')
    },
  }
}

function createControllerStub(
  options: {
    commandResult?: BubbleCommandResult
    queryResult?: BubbleQueryResult
    onCommand?: (input: BubbleCommand) => void
    onQuery?: (input: BubbleQuery) => void
    onDestroy?: () => void
  } = {}
): () => Promise<Pick<BubbleController, 'createSession'>> {
  return async () => ({
    async createSession() {
      return {
        id: 'session-1',
        async command(input: BubbleCommand) {
          options.onCommand?.(input)
          return options.commandResult ?? { ok: true }
        },
        async query(input: BubbleQuery) {
          options.onQuery?.(input)
          return (
            options.queryResult ?? {
              ok: true,
              value: createBubble().snapshot(),
            }
          )
        },
        async reset() {
          throw new Error('not implemented')
        },
        async destroy() {
          options.onDestroy?.()
        },
        subscribe() {
          return () => {}
        },
      }
    },
  })
}

describe('bubble-cli main', () => {
  test('writes human-readable query output for get-tree', async () => {
    const stdout = createWriter()
    const stderr = createWriter()

    const exitCode = await main(['query', 'get-tree'], {
      createController: createControllerStub(),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toBe(`{
  "kind": "root",
  "children": []
}
`)
    expect(stderr.toString()).toBe('')
  })

  test('writes json output mode for one-shot commands', async () => {
    const stdout = createWriter()
    const stderr = createWriter()
    const observedCommands: BubbleCommand[] = []
    let destroyCalls = 0

    const exitCode = await main(['command', 'reset', '--json'], {
      createController: createControllerStub({
        onCommand(input) {
          observedCommands.push(input)
        },
        onDestroy() {
          destroyCalls += 1
        },
      }),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(0)
    expect(observedCommands).toEqual([{ type: 'reset' }])
    expect(destroyCalls).toBe(1)
    expect(stdout.toString()).toBe(`${JSON.stringify({ ok: true }, null, 2)}\n`)
    expect(stderr.toString()).toBe('')
  })

  test('writes human-readable output mode for one-shot commands', async () => {
    const stdout = createWriter()
    const stderr = createWriter()

    const exitCode = await main(['command', 'destroy'], {
      createController: createControllerStub(),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toBe('OK\n')
    expect(stderr.toString()).toBe('')
  })

  test('writes json output mode for get-tree queries', async () => {
    const stdout = createWriter()
    const stderr = createWriter()

    const exitCode = await main(['query', 'get-tree', '--json'], {
      createController: createControllerStub(),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toBe(`{
  "ok": true,
  "value": {
    "rootId": "root",
    "nodes": {},
    "query": {}
  }
}
`)
    expect(stderr.toString()).toBe('')
  })

  test('returns a failing exit code and writes a human-readable error for control failures', async () => {
    const stdout = createWriter()
    const stderr = createWriter()
    let destroyCalls = 0

    const exitCode = await main(['query', 'get-tree'], {
      createController: createControllerStub({
        queryResult: {
          ok: false,
          error: {
            code: 'session_destroyed',
            message: 'Session session-1 has been destroyed.',
          },
        },
        onDestroy() {
          destroyCalls += 1
        },
      }),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(1)
    expect(destroyCalls).toBe(1)
    expect(stdout.toString()).toBe('')
    expect(stderr.toString()).toBe('Session session-1 has been destroyed.\n')
  })

  test('writes json errors and a failing exit code for control failures in json mode', async () => {
    const stdout = createWriter()
    const stderr = createWriter()
    let destroyCalls = 0

    const exitCode = await main(['command', 'reset', '--json'], {
      createController: createControllerStub({
        commandResult: {
          ok: false,
          error: {
            code: 'session_destroyed',
            message: 'Session session-1 has been destroyed.',
          },
        },
        onDestroy() {
          destroyCalls += 1
        },
      }),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(1)
    expect(destroyCalls).toBe(1)
    expect(stdout.toString()).toBe(`{
  "ok": false,
  "error": {
    "code": "session_destroyed",
    "message": "Session session-1 has been destroyed."
  }
}
`)
    expect(stderr.toString()).toBe('')
  })

  test('tolerates cleanup after a destroy command completes', async () => {
    const stdout = createWriter()
    const stderr = createWriter()
    let destroyCalls = 0

    const exitCode = await main(['command', 'destroy'], {
      createController: createControllerStub({
        onDestroy() {
          destroyCalls += 1
          throw {
            code: 'session_destroyed',
            message: 'Session session-1 has been destroyed.',
          }
        },
      }),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(0)
    expect(destroyCalls).toBe(1)
    expect(stdout.toString()).toBe('OK\n')
    expect(stderr.toString()).toBe('')
  })

  test('rethrows unexpected cleanup failures', async () => {
    const stdout = createWriter()
    const stderr = createWriter()

    await expect(
      main(['query', 'get-tree'], {
        createController: createControllerStub({
          onDestroy() {
            throw new Error('cleanup failed')
          },
        }),
        stdout: stdout.writer,
        stderr: stderr.writer,
      })
    ).rejects.toThrow('cleanup failed')
  })

  test('returns a failing exit code for unknown cli commands', async () => {
    const stdout = createWriter()
    const stderr = createWriter()

    const exitCode = await main(['explode'], {
      createController: createControllerStub(),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(1)
    expect(stdout.toString()).toBe('')
    expect(stderr.toString()).toBe('Unknown command: explode\n')
  })

  test('returns a failing exit code for unsupported operations within a known category', async () => {
    const stdout = createWriter()
    const stderr = createWriter()

    const exitCode = await main(['query', 'explode'], {
      createController: createControllerStub(),
      stdout: stdout.writer,
      stderr: stderr.writer,
    })

    expect(exitCode).toBe(1)
    expect(stdout.toString()).toBe('')
    expect(stderr.toString()).toBe('Unknown command: query explode\n')
  })

  test('uses the default options object when no overrides are provided', async () => {
    const exitCode = await main(['explode'])

    expect(exitCode).toBe(1)
  })
})
