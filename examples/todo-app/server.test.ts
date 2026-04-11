import { describe, expect, test } from 'vitest'

import {
  createTodoApiResponse,
  createTodoRoutes,
  handleTodoFallbackRequest,
} from './server.ts'

async function withTodoServer<T>(
  callback: (baseUrl: string) => Promise<T>,
  options?: Parameters<typeof createTodoRoutes>[0]
): Promise<T> {
  const server = Bun.serve({
    port: 0,
    development: false,
    routes: createTodoRoutes(options),
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

describe('createTodoApiResponse', () => {
  test('serves an empty todo list as JSON by default', async () => {
    const response = createTodoApiResponse()

    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual([])
  })

  test('serves custom initial todos when provided', async () => {
    const customTodos = [{ id: 'c', label: 'Custom', done: false }]
    const response = createTodoApiResponse({ initialTodos: customTodos })

    expect(await response.json()).toEqual(customTodos)
  })
})

describe('handleTodoFallbackRequest', () => {
  test('returns 405 for unsupported methods on /api/todos', () => {
    const response = handleTodoFallbackRequest(
      new Request('http://localhost/api/todos', { method: 'POST' })
    )

    expect(response.status).toBe(405)
  })

  test('returns 404 for unknown routes', () => {
    const response = handleTodoFallbackRequest(
      new Request('http://localhost/nope')
    )

    expect(response.status).toBe(404)
  })
})

describe('createTodoRoutes', () => {
  test('returns html and api routes with a configurable todos handler', async () => {
    const customTodos = [{ id: 'c', label: 'Custom', done: false }]
    const routes = createTodoRoutes({ initialTodos: customTodos })
    const apiRoute = routes['/api/todos']

    expect(Object.keys(routes).sort()).toEqual([
      '/',
      '/api/todos',
      '/index.html',
    ])
    expect(routes['/']).toBe(routes['/index.html'])
    expect(typeof apiRoute.GET).toBe('function')

    const response = apiRoute.GET()

    expect(await response.json()).toEqual(customTodos)
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
