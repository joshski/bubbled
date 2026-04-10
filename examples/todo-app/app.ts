import { createElement } from 'react'

import { createDomProjector } from '../../bubble-browser'
import { createBubble, type BubbleRuntime } from '../../bubble-core'
import { createBubbleReactRoot, type BubbleReactRoot } from '../../bubble-react'
import { TodoAppView } from './todo-app.tsx'
import {
  createTodoStore,
  type CreateTodoStoreOptions,
  type TodoItem,
  type TodoStore,
} from './todo-store.ts'

export interface MountTodoAppOptions {
  readonly bubble?: BubbleRuntime
  readonly store?: TodoStore
  readonly initialTodos?: readonly TodoItem[]
  readonly storageKey?: CreateTodoStoreOptions['storageKey']
}

export interface MountedTodoApp {
  readonly bubble: BubbleRuntime
  readonly store: TodoStore
  readonly root: BubbleReactRoot
  unmount(): void
}

export const TODO_APP_PAGE_PATHS = ['/', '/index.html'] as const
export const TODO_API_PATH = '/api/todos'

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

export function mountTodoApp(
  options: MountTodoAppOptions = {}
): MountedTodoApp {
  const bubble = options.bubble ?? createBubble()
  const store =
    options.store ??
    createTodoStore({
      storage: bubble.resolveCapability('storage'),
      initialTodos: options.initialTodos,
      storageKey: options.storageKey,
    })
  const root = createBubbleReactRoot({ bubble })

  const render = (): void => {
    root.render(
      createElement(TodoAppView, {
        todos: store.get(),
        onToggle: (id: string) => {
          store.toggle(id)
        },
        onRemove: (id: string) => {
          store.remove(id)
        },
        onAdd: () => {
          store.addSample()
        },
      })
    )
  }

  const unsubscribe = store.subscribe(render)
  render()

  return {
    bubble,
    store,
    root,
    unmount(): void {
      unsubscribe()
      root.unmount()
    },
  }
}

export interface TodoServerOptions {
  readonly initialTodos?: readonly TodoItem[]
}

export function createTodoApiResponse(
  options: TodoServerOptions = {}
): Response {
  return Response.json(options.initialTodos ?? [])
}

export function handleTodoFallbackRequest(request: Request): Response {
  const url = new URL(request.url)

  if (url.pathname === TODO_API_PATH && request.method !== 'GET') {
    return new Response('method not allowed', { status: 405 })
  }

  return new Response('not found', { status: 404 })
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
  const documentRef = options.document ?? globalThis.document
  const fetchImpl = options.fetch ?? globalThis.fetch
  const addEventListenerImpl =
    options.addEventListener ?? globalThis.addEventListener.bind(globalThis)
  const createProjector = options.createProjector ?? createDomProjector
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
