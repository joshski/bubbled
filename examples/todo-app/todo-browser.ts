import { createDomProjector } from '../../bubble-browser'
import { createBubble } from '../../bubble-core'
import { mountTodoApp } from './todo-react.ts'
import { createTodoStore, type TodoItem } from './todo-store.ts'

const TODO_API_PATH = '/api/todos'

interface TodoAppTextNodeLike {
  textContent: string | null
}

interface TodoAppMountContainerLike {
  replaceChildren(...nodes: unknown[]): void
  appendChild(node: unknown): unknown
}

interface TodoAppDocumentLike {
  getElementById(id: string): unknown
  createElement(tagName: string): TodoAppTextNodeLike
}

export interface StartTodoAppOptions {
  readonly document?: TodoAppDocumentLike
  readonly fetch?: typeof fetch
  readonly addEventListener?: typeof globalThis.addEventListener
  readonly createProjector?: typeof createDomProjector
  readonly isMountContainer?: (
    value: unknown
  ) => value is TodoAppMountContainerLike
}

async function loadInitialTodos(
  fetchImpl: typeof fetch
): Promise<readonly TodoItem[]> {
  const response = await fetchImpl(TODO_API_PATH)

  if (!response.ok) {
    throw new Error(
      `Failed to load todos: ${response.status} ${response.statusText}`
    )
  }

  return (await response.json()) as readonly TodoItem[]
}

function isDefaultMountContainer(
  value: unknown
): value is TodoAppMountContainerLike {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement
}

function renderStartupError(
  error: unknown,
  documentRef: TodoAppDocumentLike,
  isMountContainer: (value: unknown) => value is TodoAppMountContainerLike
): void {
  const container = documentRef.getElementById('app')

  if (isMountContainer(container)) {
    container.replaceChildren()
    const message = documentRef.createElement('p')
    message.textContent =
      error instanceof Error ? error.message : 'Failed to start the todo app.'
    container.appendChild(message)
  }

  console.error(error)
}

export async function startTodoApp({
  document: documentRef = globalThis.document,
  fetch: fetchImpl = globalThis.fetch,
  addEventListener: addEventListenerImpl = globalThis.addEventListener.bind(
    globalThis
  ),
  createProjector = createDomProjector,
  isMountContainer = isDefaultMountContainer,
}: StartTodoAppOptions = {}): Promise<void> {
  try {
    const container = documentRef.getElementById('app')

    if (!isMountContainer(container)) {
      throw new Error('Expected a root element with id "app".')
    }

    const bubble = createBubble()
    const initialTodos = await loadInitialTodos(fetchImpl)
    const store = createTodoStore({
      storage: bubble.resolveCapability('storage'),
      initialTodos,
    })
    const mountedApp = mountTodoApp({ bubble, store })
    const projector = createProjector({
      bubble,
      bridgeEvents: true,
      syncFocus: true,
    })

    container.replaceChildren()
    projector.mount(container as HTMLElement)

    addEventListenerImpl(
      'beforeunload',
      () => {
        projector.unmount()
        mountedApp.unmount()
      },
      { once: true }
    )
  } catch (error: unknown) {
    renderStartupError(error, documentRef, isMountContainer)
  }
}
