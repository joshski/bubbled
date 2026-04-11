import { createDomProjector } from '../../../bubble-browser'
import { createBubble } from '../../../bubble-core'
import {
  startTodoApp,
  type TodoAppContainer,
  type TodoAppTextNode,
  type TodoBrowserHost,
  type TodoFetchResponse,
} from '../app/start-todo-app.ts'
import { createTodoStore } from '../app/todo-store.ts'
import { mountTodoApp } from '../react/mountTodoApp.ts'

const host: TodoBrowserHost = {
  getAppContainer(): TodoAppContainer | null {
    const element = globalThis.document.getElementById('app')

    if (!(element instanceof HTMLElement)) return null

    return {
      replaceChildren: () => element.replaceChildren(),
      appendChild: (node: TodoAppTextNode) => {
        element.appendChild(node as unknown as Node)
      },
    }
  },
  async fetchTodos(path: string): Promise<TodoFetchResponse> {
    return globalThis.fetch(path)
  },
  onBeforeUnload(listener: () => void): void {
    globalThis.addEventListener('beforeunload', listener, { once: true })
  },
  createErrorMessage(text: string): TodoAppTextNode {
    const paragraph = globalThis.document.createElement('p')

    paragraph.textContent = text

    return paragraph
  },
  logError(error: unknown): void {
    console.error(error)
  },
  mountTodoApp({ container, initialTodos }): () => void {
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
    projector.mount(container as unknown as HTMLElement)

    return () => {
      projector.unmount()
      mountedApp.unmount()
    }
  },
}

await startTodoApp(host)
