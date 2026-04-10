import { createTodoRoutes, handleTodoFallbackRequest } from "./server.ts";

const port = Number(process.env["PORT"] ?? 3000);
const server = Bun.serve({
  port,
  development: true,
  routes: createTodoRoutes(),
  fetch(request) {
    return handleTodoFallbackRequest(request);
  },
});

console.log(`bubbled todo example listening on ${server.url}`);
