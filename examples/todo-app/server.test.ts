import { describe, expect, test } from "bun:test";

import { createTodoApiResponse, createTodoRoutes, handleTodoFallbackRequest } from "./server.ts";
import { INITIAL_TODOS } from "./todo-store.ts";

async function withTodoServer<T>(
  callback: (baseUrl: string) => Promise<T>,
  options?: Parameters<typeof createTodoRoutes>[0],
): Promise<T> {
  const server = Bun.serve({
    port: 0,
    development: false,
    routes: createTodoRoutes(options),
    fetch(request) {
      return handleTodoFallbackRequest(request);
    },
  });

  try {
    return await callback(server.url.toString());
  } finally {
    await server.stop(true);
  }
}

describe("createTodoApiResponse", () => {
  test("serves the default initial todos as JSON", async () => {
    const response = createTodoApiResponse();

    expect(response.headers.get("content-type")).toBe("application/json;charset=utf-8");
    expect(await response.json()).toEqual([...INITIAL_TODOS]);
  });

  test("serves custom initial todos when provided", async () => {
    const customTodos = [{ id: "c", label: "Custom", done: false }];
    const response = createTodoApiResponse({ initialTodos: customTodos });

    expect(await response.json()).toEqual(customTodos);
  });
});

describe("handleTodoFallbackRequest", () => {
  test("returns 405 for unsupported methods on /api/todos", () => {
    const response = handleTodoFallbackRequest(
      new Request("http://localhost/api/todos", { method: "POST" }),
    );

    expect(response.status).toBe(405);
  });

  test("returns 404 for unknown routes", () => {
    const response = handleTodoFallbackRequest(new Request("http://localhost/nope"));

    expect(response.status).toBe(404);
  });
});

describe("todo app Bun routes", () => {
  test("returns an HTML document for GET /", async () => {
    await withTodoServer(async (baseUrl) => {
      const response = await fetch(baseUrl);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      const text = await response.text();
      expect(text).toContain("<title>Bubbled Todos</title>");
      expect(text).toContain('<main id="app">');
      expect(text).toContain("Loading todos...");
    });
  });

  test("also serves HTML from /index.html", async () => {
    await withTodoServer(async (baseUrl) => {
      const response = await fetch(new URL("/index.html", baseUrl));

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });

  test("serves the bundled client asset referenced by the HTML page", async () => {
    await withTodoServer(async (baseUrl) => {
      const pageResponse = await fetch(baseUrl);
      const html = await pageResponse.text();
      const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];

      expect(scriptPath).toBeDefined();

      const assetResponse = await fetch(new URL(scriptPath as string, baseUrl));

      expect(assetResponse.status).toBe(200);
      expect(assetResponse.headers.get("content-type")).toContain("javascript");
    });
  });

  test("serves the default initial todos as JSON from /api/todos", async () => {
    await withTodoServer(async (baseUrl) => {
      const response = await fetch(new URL("/api/todos", baseUrl));

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json;charset=utf-8");
      expect(await response.json()).toEqual([...INITIAL_TODOS]);
    });
  });

  test("serves custom initial todos from /api/todos when provided", async () => {
    const customTodos = [{ id: "c", label: "Custom", done: false }];

    await withTodoServer(
      async (baseUrl) => {
        const response = await fetch(new URL("/api/todos", baseUrl));

        expect(await response.json()).toEqual(customTodos);
      },
      { initialTodos: customTodos },
    );
  });

  test("returns 404 for unknown routes", async () => {
    await withTodoServer(async (baseUrl) => {
      const response = await fetch(new URL("/nope", baseUrl));

      expect(response.status).toBe(404);
    });
  });

  test("returns 405 for unsupported methods on /api/todos", async () => {
    await withTodoServer(async (baseUrl) => {
      const response = await fetch(new URL("/api/todos", baseUrl), { method: "POST" });

      expect(response.status).toBe(405);
    });
  });
});
