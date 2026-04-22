import { createElement } from 'react'

import type { TodoItem } from '../domain/todos.ts'

import {
  createBrowserNetwork,
  startBubbleReactApp,
} from '../../../bubble-browser'
import { TodoApp } from '../react/TodoApp.tsx'

const TODO_API_PATH = '/api/todos'

await startBubbleReactApp({
  capabilities: {
    network: createBrowserNetwork(),
  },
  async node(bubble) {
    const response = await bubble.fetch({ method: 'GET', url: TODO_API_PATH })

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to load todos: ${response.status}`)
    }

    return createElement(TodoApp, {
      initialTodos: JSON.parse(response.body) as readonly TodoItem[],
      storage: bubble.resolveCapability('storage'),
    })
  },
})
