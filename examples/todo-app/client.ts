import { createDomProjector } from '../../bubble-browser'
import { createBubble } from '../../bubble-core'

import { mountTodoApp } from './mount.tsx'
import type { TodoItem } from './todo-store.ts'

async function loadInitialTodos(): Promise<readonly TodoItem[]> {
  const response = await fetch('/api/todos')

  if (!response.ok) {
    throw new Error(
      `Failed to load todos: ${response.status} ${response.statusText}`
    )
  }

  return (await response.json()) as readonly TodoItem[]
}

async function start(): Promise<void> {
  const container = document.getElementById('app')

  if (!(container instanceof HTMLElement)) {
    throw new Error('Expected a root element with id "app".')
  }

  const bubble = createBubble()
  const initialTodos = await loadInitialTodos()
  const mountedApp = mountTodoApp({ bubble, initialTodos })
  const projector = createDomProjector({
    bubble,
    bridgeEvents: true,
    syncFocus: true,
  })

  container.replaceChildren()
  projector.mount(container)

  addEventListener(
    'beforeunload',
    () => {
      projector.unmount()
      mountedApp.unmount()
    },
    { once: true }
  )
}

try {
  await start()
} catch (error: unknown) {
  const container = document.getElementById('app')

  if (container instanceof HTMLElement) {
    container.replaceChildren()
    const message = document.createElement('p')
    message.textContent =
      error instanceof Error ? error.message : 'Failed to start the todo app.'
    container.appendChild(message)
  }

  console.error(error)
}
