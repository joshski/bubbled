import { describe, expect, test } from 'vitest'

import { createTodoRoutes, handleTodoFallbackRequest } from './server.ts'

async function withTodoServer<T>(
  callback: (baseUrl: string) => Promise<T>
): Promise<T> {
  const server = Bun.serve({
    port: 0,
    development: false,
    routes: createTodoRoutes(),
    fetch(request) {
      return handleTodoFallbackRequest(request)
    },
  })

  try {
    return await callback(server.url.toString())
  } finally {
    await server.stop(true)
  }
}

describe('handleTodoFallbackRequest', () => {
  test('returns 404 for unknown routes', () => {
    const response = handleTodoFallbackRequest(
      new Request('http://localhost/nope')
    )

    expect(response.status).toBe(404)
  })
})

describe('createTodoRoutes', () => {
  test('returns the html routes for the todo app', () => {
    const routes = createTodoRoutes()

    expect(Object.keys(routes).sort()).toEqual(['/', '/index.html'])
    expect(routes['/']).toBe(routes['/index.html'])
  })
})

describe('todo app Bun routes', () => {
  test('serves the bundled client asset referenced by the HTML page', async () => {
    await withTodoServer(async baseUrl => {
      const pageResponse = await fetch(baseUrl)
      const html = await pageResponse.text()
      const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1]

      expect(scriptPath).toBeDefined()

      const assetResponse = await fetch(new URL(scriptPath as string, baseUrl))

      expect(assetResponse.status).toBe(200)
      expect(assetResponse.headers.get('content-type')).toContain('javascript')
    })
  })
})
