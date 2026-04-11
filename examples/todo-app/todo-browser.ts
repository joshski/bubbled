import type { TodoItem } from './todo-store.ts'

import { createDomProjector } from '../../bubble-browser'
import { createBubble } from '../../bubble-core'
import { TODO_API_PATH } from './todo-http.ts'
import { mountTodoApp } from './todo-react.ts'

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

export async function startTodoApp(
  options: StartTodoAppOptions = {}
): Promise<void> {
  /* istanbul ignore next -- browser entrypoints exercise the default document wiring. */
  const documentRef = options.document ?? globalThis.document
  /* istanbul ignore next -- browser entrypoints exercise the default fetch wiring. */
  const fetchImpl = options.fetch ?? globalThis.fetch
  /* istanbul ignore next -- browser entrypoints exercise the default event wiring. */
  const addEventListenerImpl =
    options.addEventListener ?? globalThis.addEventListener.bind(globalThis)
  /* istanbul ignore next -- browser entrypoints exercise the default projector wiring. */
  const createProjector = options.createProjector ?? createDomProjector
  /* istanbul ignore next -- browser entrypoints exercise the default mount predicate. */
  const isMountContainer = options.isMountContainer ?? isDefaultMountContainer

  try {
    const container = documentRef.getElementById('app')

    if (!isMountContainer(container)) {
      throw new Error('Expected a root element with id "app".')
    }

    const bubble = createBubble()
    const initialTodos = await loadInitialTodos(fetchImpl)
    const mountedApp = mountTodoApp({ bubble, initialTodos })
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
