import { createDomProjector } from '../../bubble-browser'
import { createBubble } from '../../bubble-core'
import { mountTodoApp } from './todo-react.ts'
import { createTodoStore } from './todo-store.ts'

const TODO_API_PATH = '/api/todos'

export async function startTodoApp(): Promise<void> {
  try {
    const container = globalThis.document.getElementById('app')

    if (!(container instanceof HTMLElement)) {
      throw new Error('Expected a root element with id "app".')
    }

    const response = await globalThis.fetch(TODO_API_PATH)

    if (!response.ok) {
      throw new Error(
        `Failed to load todos: ${response.status} ${response.statusText}`
      )
    }

    const initialTodos = await response.json()
    const bubble = createBubble()
    const store = createTodoStore({
      storage: bubble.resolveCapability('storage'),
      initialTodos,
    })
    const mountedApp = mountTodoApp({ bubble, store })
    const projector = createDomProjector({
      bubble,
      bridgeEvents: true,
      syncFocus: true,
    })

    container.replaceChildren()
    projector.mount(container)

    globalThis.addEventListener(
      'beforeunload',
      () => {
        projector.unmount()
        mountedApp.unmount()
      },
      { once: true }
    )
  } catch (error: unknown) {
    const container = globalThis.document.getElementById('app')

    if (container instanceof HTMLElement) {
      container.replaceChildren()
      const message = globalThis.document.createElement('p')
      message.textContent =
        error instanceof Error ? error.message : 'Failed to start the todo app.'
      container.appendChild(message)
    }

    console.error(error)
  }
}
