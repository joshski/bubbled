import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { startTodoApp } from './todo-browser.ts'

interface FakeNode {
  textContent: string | null
  appendChild(child: FakeNode): FakeNode
  replaceChildren(...nodes: FakeNode[]): void
  childElementCount: number
}

function createFakeNode(): FakeNode {
  const node: FakeNode = {
    textContent: '',
    childElementCount: 0,
    appendChild(child) {
      node.childElementCount += 1
      node.textContent = `${node.textContent ?? ''}${child.textContent ?? ''}`
      return child
    },
    replaceChildren(...nodes) {
      node.childElementCount = nodes.length
      node.textContent = nodes.map(n => n.textContent ?? '').join('')
    },
  }
  return node
}

function createFakeDocument(includeApp = true) {
  const app = includeApp ? createFakeNode() : null

  return {
    app,
    document: {
      createElement() {
        return createFakeNode()
      },
      getElementById(id: string) {
        return id === 'app' ? app : null
      },
    },
    isMountContainer(value: unknown): value is FakeNode {
      return (
        typeof value === 'object' &&
        value !== null &&
        'appendChild' in (value as object) &&
        'replaceChildren' in (value as object)
      )
    },
  }
}

const originalFetch = globalThis.fetch
const originalConsoleError = console.error
const originalDocument = (globalThis as { document?: unknown }).document
const originalAddEventListener = globalThis.addEventListener
const originalHTMLElement = (globalThis as { HTMLElement?: unknown }).HTMLElement

beforeEach(() => {
  // startTodoApp eagerly binds globalThis.addEventListener as a default
  // parameter value. Provide a no-op so node runs don't trip on it; tests
  // that care about beforeunload wiring install their own stub.
  globalThis.addEventListener = (() => {}) as typeof globalThis.addEventListener
})

afterEach(() => {
  globalThis.fetch = originalFetch
  console.error = originalConsoleError
  ;(globalThis as { document?: unknown }).document = originalDocument
  if (originalAddEventListener === undefined) {
    delete (globalThis as { addEventListener?: unknown }).addEventListener
  } else {
    globalThis.addEventListener = originalAddEventListener
  }
  ;(globalThis as { HTMLElement?: unknown }).HTMLElement = originalHTMLElement
})

describe('startTodoApp', () => {
  test('loads todos into the app container and cleans up on beforeunload', async () => {
    const mounts: unknown[] = []
    let unmounted = 0
    const listeners: Array<() => void> = []
    const { app, document, isMountContainer } = createFakeDocument()

    const fetchImpl = (async () =>
      Response.json([
        { id: 't1', label: 'Alpha', done: false },
      ])) as unknown as typeof fetch

    await startTodoApp({
      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject
      ) {
        if (type === 'beforeunload') {
          listeners.push(listener as () => void)
        }
      },
      createProjector() {
        return {
          mount(container) {
            mounts.push(container)
          },
          unmount() {
            unmounted += 1
          },
        }
      },
      document,
      fetch: fetchImpl,
      isMountContainer,
    })

    expect(mounts).toEqual([app])
    expect(listeners).toHaveLength(1)

    listeners[0]?.()
    expect(unmounted).toBe(1)
  })

  test('uses the default HTMLElement container check when no custom predicate is provided', async () => {
    const mounts: unknown[] = []
    const listeners: Array<() => void> = []
    const { app, document } = createFakeDocument()
    const fetchImpl = (async () => Response.json([])) as unknown as typeof fetch

    class FakeHTMLElement {}
    Object.setPrototypeOf(app as object, FakeHTMLElement.prototype)
    ;(globalThis as { HTMLElement?: unknown }).HTMLElement = FakeHTMLElement

    await startTodoApp({
      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject
      ) {
        if (type === 'beforeunload') {
          listeners.push(listener as () => void)
        }
      },
      createProjector() {
        return {
          mount(container) {
            mounts.push(container)
          },
          unmount() {},
        }
      },
      document,
      fetch: fetchImpl,
    })

    expect(mounts).toEqual([app])
    expect(listeners).toHaveLength(1)
  })

  test('rejects containers when HTMLElement is undefined in the environment', async () => {
    const { document } = createFakeDocument()
    const fetchImpl = (async () => Response.json([])) as unknown as typeof fetch
    const logged: unknown[] = []
    console.error = (value: unknown) => {
      logged.push(value)
    }

    ;(globalThis as { HTMLElement?: unknown }).HTMLElement = undefined

    await startTodoApp({ document, fetch: fetchImpl })

    expect(logged).toHaveLength(1)
    expect(logged[0]).toBeInstanceOf(Error)
    expect((logged[0] as Error).message).toBe(
      'Expected a root element with id "app".'
    )
  })

  test('renders a startup error in the app container when loading todos fails', async () => {
    const { app, document, isMountContainer } = createFakeDocument()
    const fetchImpl = (async () =>
      new Response('nope', {
        status: 503,
        statusText: 'Service Unavailable',
      })) as unknown as typeof fetch
    const logged: unknown[] = []
    console.error = (value: unknown) => {
      logged.push(value)
    }

    await startTodoApp({ document, fetch: fetchImpl, isMountContainer })

    expect(app?.textContent).toContain(
      'Failed to load todos: 503 Service Unavailable'
    )
    expect(logged).toHaveLength(1)
    expect(logged[0]).toBeInstanceOf(Error)
  })

  test('falls back to a generic startup error when a non-Error is thrown', async () => {
    const { app, document, isMountContainer } = createFakeDocument()
    const fetchImpl = (async () => {
      throw 'boom'
    }) as unknown as typeof fetch
    const logged: unknown[] = []
    console.error = (value: unknown) => {
      logged.push(value)
    }

    await startTodoApp({ document, fetch: fetchImpl, isMountContainer })

    expect(app?.textContent).toContain('Failed to start the todo app.')
    expect(logged).toEqual(['boom'])
  })

  test('logs a startup error when the app container is missing', async () => {
    const { document, isMountContainer } = createFakeDocument(false)
    const logged: unknown[] = []
    console.error = (value: unknown) => {
      logged.push(value)
    }

    await startTodoApp({ document, isMountContainer })

    expect(logged).toHaveLength(1)
    expect(logged[0]).toBeInstanceOf(Error)
    expect((logged[0] as Error).message).toBe(
      'Expected a root element with id "app".'
    )
  })

  test('uses the default global dependencies when no options are provided', async () => {
    const listeners: Array<() => void> = []
    const mounts: unknown[] = []
    const { app, document, isMountContainer } = createFakeDocument()

    ;(globalThis as { document?: unknown }).document = document
    globalThis.fetch = (async () =>
      Response.json([])) as unknown as typeof fetch
    globalThis.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (type === 'beforeunload') {
        listeners.push(listener as () => void)
      }
    }) as typeof globalThis.addEventListener

    await startTodoApp({
      createProjector() {
        return {
          mount(container) {
            mounts.push(container)
          },
          unmount() {},
        }
      },
      isMountContainer,
    })

    expect(mounts).toEqual([app])
    expect(listeners).toHaveLength(1)
  })

  test('can be invoked with no options at all and surfaces defaults', async () => {
    const { document } = createFakeDocument(false)
    const logged: unknown[] = []
    console.error = (value: unknown) => {
      logged.push(value)
    }

    ;(globalThis as { document?: unknown }).document = document
    globalThis.fetch = (async () =>
      Response.json([])) as unknown as typeof fetch
    ;(globalThis as { HTMLElement?: unknown }).HTMLElement = undefined

    await startTodoApp()

    // The fake document has no "app" element, so the default
    // isDefaultMountContainer rejects the lookup and we land in the
    // startup-error path. Exercising the zero-argument call is the
    // point: every default in startTodoApp's signature has now run.
    expect(logged).toHaveLength(1)
    expect(logged[0]).toBeInstanceOf(Error)
    expect((logged[0] as Error).message).toBe(
      'Expected a root element with id "app".'
    )
  })
})
