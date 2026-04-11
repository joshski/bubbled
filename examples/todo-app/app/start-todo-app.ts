import type { TodoItem } from '../domain/todos.ts'

const TODO_API_PATH = '/api/todos'

export interface TodoFetchResponse {
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  json(): Promise<unknown>
}

export interface TodoAppContainer {
  replaceChildren(): void
  appendChild(node: unknown): unknown
}

export interface TodoAppTextNode {
  textContent: string
}

export interface TodoBrowserHost {
  getAppContainer(): TodoAppContainer | null
  fetchTodos(path: string): Promise<TodoFetchResponse>
  onBeforeUnload(listener: () => void): void
  createErrorMessage(text: string): TodoAppTextNode
  logError(error: unknown): void
  mountTodoApp(args: {
    container: TodoAppContainer
    initialTodos: readonly TodoItem[]
  }): () => void
}

export async function startTodoApp(host: TodoBrowserHost): Promise<void> {
  try {
    const container = host.getAppContainer()

    if (container === null) {
      throw new Error('Expected a root element with id "app".')
    }

    const response = await host.fetchTodos(TODO_API_PATH)

    if (!response.ok) {
      throw new Error(
        `Failed to load todos: ${response.status} ${response.statusText}`
      )
    }

    const initialTodos = (await response.json()) as readonly TodoItem[]
    const dispose = host.mountTodoApp({ container, initialTodos })

    host.onBeforeUnload(() => {
      dispose()
    })
  } catch (error: unknown) {
    const container = host.getAppContainer()

    if (container !== null) {
      container.replaceChildren()
      container.appendChild(
        host.createErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to start the todo app.'
        )
      )
    }

    host.logError(error)
  }
}
