import type { BubbleRuntime } from '../../../bubble-core'
import type { TodoItem } from '../domain/todos.ts'

import { mountTodoApp, type MountedTodoApp } from '../react/mountTodoApp.ts'

const TODO_API_PATH = '/api/todos'

export interface TodoAppContainer {
  replaceChildren(): void
  appendChild(node: TodoAppTextNode): void
}

export interface TodoAppTextNode {
  textContent: string
}

export interface TodoStartHost {
  getAppContainer(): TodoAppContainer | null
  mountApp(container: TodoAppContainer, app: MountedTodoApp): () => void
  onBeforeUnload(listener: () => void): void
  createErrorMessage(text: string): TodoAppTextNode
  logError(error: unknown): void
}

export async function startTodoApp(
  host: TodoStartHost,
  bubble: BubbleRuntime
): Promise<void> {
  try {
    const container = host.getAppContainer()

    if (container === null) {
      throw new Error('Expected a root element with id "app".')
    }

    const response = await bubble.fetch({ method: 'GET', url: TODO_API_PATH })

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to load todos: ${response.status}`)
    }

    const initialTodos = JSON.parse(response.body) as readonly TodoItem[]
    const app = mountTodoApp({ bubble, initialTodos })
    const dispose = host.mountApp(container, app)

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
