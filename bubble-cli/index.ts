import {
  createController,
  type BubbleCommand,
  type BubbleCommandResult,
  type BubbleController,
  type BubbleQuery,
  type BubbleQueryResult,
  type BubbleSession,
} from '../bubble-control'
import { serializeBubbleSnapshot } from '../bubble-core'

interface BubbleCliWriter {
  write(chunk: string): void
}

export interface BubbleCliOptions {
  createController?: () => Promise<Pick<BubbleController, 'createSession'>>
  stdout?: BubbleCliWriter
  stderr?: BubbleCliWriter
}

interface ParsedCliArguments {
  readonly positional: readonly string[]
  readonly json: boolean
}

function parseCliArguments(argv: readonly string[]): ParsedCliArguments {
  const positional: string[] = []
  let json = false

  for (const argument of argv) {
    if (argument === '--json') {
      json = true
      continue
    }

    positional.push(argument)
  }

  return {
    positional,
    json,
  }
}

function writeLine(writer: BubbleCliWriter, value: string): void {
  writer.write(`${value}\n`)
}

function writeFailure(
  result: Extract<BubbleCommandResult | BubbleQueryResult, { ok: false }>,
  options: {
    json: boolean
    stdout: BubbleCliWriter
    stderr: BubbleCliWriter
  }
): number {
  if (options.json) {
    writeLine(options.stdout, JSON.stringify(result, null, 2))
    return 1
  }

  writeLine(options.stderr, result.error.message)
  return 1
}

function isSupportedCommandType(type: string): type is BubbleCommand['type'] {
  return type === 'reset' || type === 'destroy'
}

function isSupportedQueryType(type: string): type is BubbleQuery['type'] {
  return type === 'get-tree'
}

function formatCommandSuccess(): string {
  return 'OK'
}

function formatTreeQuerySuccess(
  result: Extract<BubbleQueryResult, { ok: true }>
): string {
  return serializeBubbleSnapshot(result.value)
}

async function destroyOneShotSession(
  session: Pick<BubbleSession, 'destroy'>
): Promise<void> {
  try {
    await session.destroy()
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'session_destroyed'
    ) {
      return
    }

    throw error
  }
}

export async function main(
  argv: readonly string[],
  {
    createController: createCliController = createController,
    stdout = process.stdout,
    stderr = process.stderr,
  }: BubbleCliOptions = {}
): Promise<number> {
  const { positional, json } = parseCliArguments(argv)
  const category = positional[0]
  const type = positional[1]

  if (
    category === undefined ||
    type === undefined ||
    (category !== 'command' && category !== 'query') ||
    positional.length !== 2
  ) {
    writeLine(stderr, `Unknown command: ${argv.join(' ')}`)
    return 1
  }

  const controller = await createCliController()
  const session = await controller.createSession()
  try {
    if (category === 'command' && isSupportedCommandType(type)) {
      const result = await session.command({ type })

      if (!result.ok) {
        return writeFailure(result, {
          json,
          stdout,
          stderr,
        })
      }

      if (json) {
        writeLine(stdout, JSON.stringify(result, null, 2))
        return 0
      }

      writeLine(stdout, formatCommandSuccess())
      return 0
    }

    if (category === 'query' && isSupportedQueryType(type)) {
      const result = await session.query({ type })

      if (!result.ok) {
        return writeFailure(result, {
          json,
          stdout,
          stderr,
        })
      }

      if (json) {
        writeLine(stdout, JSON.stringify(result, null, 2))
        return 0
      }

      writeLine(stdout, formatTreeQuerySuccess(result))
      return 0
    }

    writeLine(stderr, `Unknown command: ${argv.join(' ')}`)
    return 1
  } finally {
    await destroyOneShotSession(session)
  }
}
