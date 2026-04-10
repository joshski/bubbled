import type { TodoItem } from './todo-store.ts'

import todoAppPage from './index.html'

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

  if (url.pathname === '/api/todos' && request.method !== 'GET') {
    return new Response('method not allowed', { status: 405 })
  }

  return new Response('not found', { status: 404 })
}

export function createTodoRoutes(options: TodoServerOptions = {}) {
  return {
    '/': todoAppPage,
    '/index.html': todoAppPage,
    '/api/todos': {
      GET() {
        return createTodoApiResponse(options)
      },
    },
  } as const
}
