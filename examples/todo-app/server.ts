import todoAppPage from "./index.html";
import { INITIAL_TODOS, type TodoItem } from "./todo-store.ts";

export interface TodoServerOptions {
  readonly initialTodos?: readonly TodoItem[];
}

export function createTodoApiResponse(options: TodoServerOptions = {}): Response {
  return Response.json(options.initialTodos ?? INITIAL_TODOS);
}

export function handleTodoFallbackRequest(request: Request): Response {
  const url = new URL(request.url);

  if (url.pathname === "/api/todos" && request.method !== "GET") {
    return new Response("method not allowed", { status: 405 });
  }

  return new Response("not found", { status: 404 });
}

export function createTodoRoutes(options: TodoServerOptions = {}) {
  return {
    "/": todoAppPage,
    "/index.html": todoAppPage,
    "/api/todos": {
      GET() {
        return createTodoApiResponse(options);
      },
    },
  } as const;
}
