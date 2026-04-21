import { describe, expect, test } from 'vitest'

import type { TodoItem } from '../domain/todos.ts'

import type { BubbleNetwork } from '../../../bubble-capabilities'
import { createBubble } from '../../../bubble-core'
import type { MountedTodoApp } from '../react/mountTodoApp.ts'
import {
  startTodoApp,
  type TodoAppContainer,
  type TodoAppTextNode,
  type TodoStartHost,
} from './start-todo-app.ts'

function createFakeContainer(): TodoAppContainer & {
  children: TodoAppTextNode[]
} {
  const container = {
    children: [] as TodoAppTextNode[],
    replaceChildren(): void {
      container.children = []
    },
    appendChild(node: TodoAppTextNode): void {
      container.children.push(node)
    },
  }

  return container
}

function createJsonNetwork(body: unknown): BubbleNetwork {
  return {
    async fetch() {
      return { status: 200, headers: {}, body: JSON.stringify(body) }
    },
  }
}

interface FakeHostLog {
  beforeUnload: Array<() => void>
  errorMessages: string[]
  logged: unknown[]
  mounts: Array<{ container: TodoAppContainer; app: MountedTodoApp }>
  disposeCount: number
}

interface FakeHostOptions {
  getContainer?: () => TodoAppContainer | null
}

function createFakeHost(options: FakeHostOptions = {}): {
  host: TodoStartHost
  log: FakeHostLog
  container: TodoAppContainer & { children: TodoAppTextNode[] }
} {
  const container = createFakeContainer()
  const log: FakeHostLog = {
    beforeUnload: [],
    errorMessages: [],
    logged: [],
    mounts: [],
    disposeCount: 0,
  }

  const getContainer =
    options.getContainer ?? ((): TodoAppContainer | null => container)

  const host: TodoStartHost = {
    getAppContainer: getContainer,
    mountApp(c, app) {
      log.mounts.push({ container: c, app })
      return () => {
        log.disposeCount += 1
      }
    },
    onBeforeUnload(listener): void {
      log.beforeUnload.push(listener)
    },
    createErrorMessage(text): TodoAppTextNode {
      log.errorMessages.push(text)
      return { textContent: text }
    },
    logError(error): void {
      log.logged.push(error)
    },
  }

  return { host, log, container }
}

describe('startTodoApp', () => {
  test('loads todos into the app container and wires up beforeunload cleanup', async () => {
    const todos: readonly TodoItem[] = [
      { id: 't1', label: 'Alpha', done: false },
    ]
    const bubble = createBubble({ capabilities: { network: createJsonNetwork(todos) } })
    const { host, log, container } = createFakeHost()

    await startTodoApp(host, bubble)

    expect(log.mounts).toHaveLength(1)
    expect(log.mounts[0]?.container).toBe(container)
    expect(log.mounts[0]?.app.store.get()).toEqual(todos)
    expect(log.beforeUnload).toHaveLength(1)
    expect(log.errorMessages).toEqual([])
    expect(log.logged).toEqual([])
    expect(log.disposeCount).toBe(0)
  })

  test('disposes the mounted app when the beforeunload listener fires', async () => {
    const bubble = createBubble({ capabilities: { network: createJsonNetwork([]) } })
    const { host, log } = createFakeHost()

    await startTodoApp(host, bubble)

    const listener = log.beforeUnload[0]
    expect(listener).toBeDefined()
    listener?.()

    expect(log.disposeCount).toBe(1)
  })

  test('logs a startup error when the app container is missing', async () => {
    const bubble = createBubble()
    const { host, log } = createFakeHost({
      getContainer: () => null,
    })

    await startTodoApp(host, bubble)

    expect(log.mounts).toEqual([])
    expect(log.errorMessages).toEqual([])
    expect(log.logged).toHaveLength(1)
    expect(log.logged[0]).toBeInstanceOf(Error)
    expect((log.logged[0] as Error).message).toBe(
      'Expected a root element with id "app".'
    )
  })

  test('renders the startup error in the container if it reappears during the catch', async () => {
    const container = createFakeContainer()
    let callCount = 0
    const bubble = createBubble()
    const { host, log } = createFakeHost({
      getContainer: () => {
        callCount += 1
        return callCount === 1 ? null : container
      },
    })

    await startTodoApp(host, bubble)

    expect(container.children).toHaveLength(1)
    expect(container.children[0]?.textContent).toBe(
      'Expected a root element with id "app".'
    )
    expect(log.errorMessages).toEqual([
      'Expected a root element with id "app".',
    ])
  })

  test('renders a startup error in the container when loading todos fails', async () => {
    const network: BubbleNetwork = {
      async fetch() {
        return { status: 503, headers: {}, body: '' }
      },
    }
    const bubble = createBubble({ capabilities: { network } })
    const { host, log, container } = createFakeHost()

    await startTodoApp(host, bubble)

    expect(log.mounts).toEqual([])
    expect(container.children).toHaveLength(1)
    expect(container.children[0]?.textContent).toBe('Failed to load todos: 503')
    expect(log.logged).toHaveLength(1)
    expect(log.logged[0]).toBeInstanceOf(Error)
  })

  test('falls back to a generic startup error when a non-Error is thrown', async () => {
    const network: BubbleNetwork = {
      async fetch() {
        throw 'boom'
      },
    }
    const bubble = createBubble({ capabilities: { network } })
    const { host, log, container } = createFakeHost()

    await startTodoApp(host, bubble)

    expect(container.children).toHaveLength(1)
    expect(container.children[0]?.textContent).toBe(
      'Failed to start the todo app.'
    )
    expect(log.logged).toEqual(['boom'])
  })
})
