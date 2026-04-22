import todoAppPage from './index.html'

export const TODO_APP_ROOT_PATH = '/'
export const TODO_APP_INDEX_PATH = '/index.html'

export function handleTodoFallbackRequest(_request: Request): Response {
  return new Response('not found', { status: 404 })
}

export function createTodoRoutes() {
  return {
    [TODO_APP_ROOT_PATH]: todoAppPage,
    [TODO_APP_INDEX_PATH]: todoAppPage,
  } as const
}
