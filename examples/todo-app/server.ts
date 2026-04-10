import {
  createTodoApiResponse,
  handleTodoFallbackRequest,
  TODO_API_PATH,
  TODO_APP_PAGE_PATHS,
  type TodoServerOptions,
} from './app.ts'
import todoAppPage from './index.html'

export { createTodoApiResponse, handleTodoFallbackRequest }
export type { TodoServerOptions }

export function createTodoRoutes(options: TodoServerOptions = {}) {
  return {
    [TODO_APP_PAGE_PATHS[0]]: todoAppPage,
    [TODO_APP_PAGE_PATHS[1]]: todoAppPage,
    [TODO_API_PATH]: {
      GET() {
        return createTodoApiResponse(options)
      },
    },
  } as const
}
