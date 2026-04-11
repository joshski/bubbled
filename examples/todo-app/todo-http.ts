import type { TodoItem } from './todo-store.ts'

export const TODO_APP_ROOT_PATH = '/'
export const TODO_APP_INDEX_PATH = '/index.html'
export const TODO_API_PATH = '/api/todos'

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
