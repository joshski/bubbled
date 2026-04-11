import todoAppPage from './index.html'
import {
  createTodoApiResponse,
  handleTodoFallbackRequest,
  TODO_API_PATH,
  TODO_APP_INDEX_PATH,
  TODO_APP_ROOT_PATH,
  type TodoServerOptions,
} from './todo-http.ts'

export { createTodoApiResponse, handleTodoFallbackRequest }
export type { TodoServerOptions }

export function createTodoRoutes(options: TodoServerOptions = {}) {
  return {
    [TODO_APP_ROOT_PATH]: todoAppPage,
    [TODO_APP_INDEX_PATH]: todoAppPage,
    [TODO_API_PATH]: {
      GET() {
        return createTodoApiResponse(options)
      },
    },
  } as const
}
