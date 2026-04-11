import { createDomProjector } from '../../bubble-browser'
import { createBubble } from '../../bubble-core'
import {
  startTodoApp,
  type TodoAppContainer,
  type TodoAppTextNode,
  type TodoBrowserHost,
  type TodoFetchResponse,
} from './todo-browser.ts'
import { mountTodoApp } from './todo-react.ts'
import { createTodoStore } from './todo-store.ts'

const host: TodoBrowserHost = {
  getAppContainer(): TodoAppContainer | null {
    const element = globalThis.document.getElementById('app')

    return element instanceof HTMLElement ? element : null
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
