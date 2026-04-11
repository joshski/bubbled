import { describe, expect, test } from 'vitest'

import type { TodoItem } from '../domain/todos.ts'

import {
  startTodoApp,
  type TodoAppContainer,
  type TodoAppTextNode,
  type TodoBrowserHost,
  type TodoFetchResponse,
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

function createJsonResponse(body: unknown): TodoFetchResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    async json(): Promise<unknown> {
      return body
    },
  }
}

interface FakeHostLog {
  fetched: string[]
  beforeUnload: Array<() => void>
  errorMessages: string[]
  logged: unknown[]
  mounts: Array<{
    container: TodoAppContainer
    initialTodos: readonly TodoItem[]
  }>
  disposeCount: number
}

interface FakeHostOptions {
  getContainer?: () => TodoAppContainer | null
  fetchTodos?: (path: string) => Promise<TodoFetchResponse>
}

function createFakeHost(options: FakeHostOptions = {}): {
  host: TodoBrowserHost
  log: FakeHostLog
  container: TodoAppContainer & { children: TodoAppTextNode[] }
} {
  const container = createFakeContainer()
  const log: FakeHostLog = {
    fetched: [],
    beforeUnload: [],
    errorMessages: [],
    logged: [],
    mounts: [],
    disposeCount: 0,
  }

  const getContainer =
    options.getContainer ?? ((): TodoAppContainer | null => container)

  const host: TodoBrowserHost = {
    getAppContainer: getContainer,
    async fetchTodos(path): Promise<TodoFetchResponse> {
      log.fetched.push(path)

      if (options.fetchTodos !== undefined) {
        return options.fetchTodos(path)
      }

      return createJsonResponse([])
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
    mountTodoApp(args): () => void {
      log.mounts.push(args)
      return () => {
        log.disposeCount += 1
      }
    },
  }

  return { host, log, container }
}

describe('startTodoApp', () => {
  test('loads todos into the app container and wires up beforeunload cleanup', async () => {
    const todos: readonly TodoItem[] = [
      { id: 't1', label: 'Alpha', done: false },
    ]
    const { host, log, container } = createFakeHost({
      fetchTodos: async () => createJsonResponse(todos),
    })

    await startTodoApp(host)

    expect(log.fetched).toEqual(['/api/todos'])
    expect(log.mounts).toHaveLength(1)
    expect(log.mounts[0]?.container).toBe(container)
    expect(log.mounts[0]?.initialTodos).toBe(todos)
    expect(log.beforeUnload).toHaveLength(1)
    expect(log.errorMessages).toEqual([])
    expect(log.logged).toEqual([])
    expect(log.disposeCount).toBe(0)
  })

  test('disposes the mounted app when the beforeunload listener fires', async () => {
    const { host, log } = createFakeHost()

    await startTodoApp(host)

    const listener = log.beforeUnload[0]
    expect(listener).toBeDefined()
    listener?.()

    expect(log.disposeCount).toBe(1)
  })

  test('logs a startup error when the app container is missing', async () => {
    const { host, log } = createFakeHost({
      getContainer: () => null,
    })

    await startTodoApp(host)

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
    const { host, log } = createFakeHost({
      getContainer: () => {
        callCount += 1
        return callCount === 1 ? null : container
      },
    })

    await startTodoApp(host)

    expect(container.children).toHaveLength(1)
    expect(container.children[0]?.textContent).toBe(
      'Expected a root element with id "app".'
    )
    expect(log.errorMessages).toEqual([
      'Expected a root element with id "app".',
    ])
  })

  test('renders a startup error in the container when loading todos fails', async () => {
    const { host, log, container } = createFakeHost({
      fetchTodos: async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        async json(): Promise<unknown> {
          return null
        },
      }),
    })

    await startTodoApp(host)

    expect(log.mounts).toEqual([])
    expect(container.children).toHaveLength(1)
    expect(container.children[0]?.textContent).toBe(
      'Failed to load todos: 503 Service Unavailable'
    )
    expect(log.logged).toHaveLength(1)
    expect(log.logged[0]).toBeInstanceOf(Error)
  })

  test('falls back to a generic startup error when a non-Error is thrown', async () => {
    const { host, log, container } = createFakeHost({
      fetchTodos: async () => {
        throw 'boom'
      },
    })

    await startTodoApp(host)

    expect(container.children).toHaveLength(1)
    expect(container.children[0]?.textContent).toBe(
      'Failed to start the todo app.'
    )
    expect(log.logged).toEqual(['boom'])
  })
})
