import { describe, expect, test } from 'vitest'

import {
  createTodoApiResponse,
  handleTodoFallbackRequest,
} from './todo-http.ts'

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
