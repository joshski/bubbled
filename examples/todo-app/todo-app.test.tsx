import { afterEach, describe, expect, test } from 'vitest'

import {
  createBubble,
  serializeBubbleSnapshot,
  type BubbleSerializedElementNode,
  type BubbleSerializedNode,
} from '../../bubble-core'
import { createSemanticAssertions } from '../../bubble-test'
import { startTodoApp } from './todo-browser.ts'
import { mountTodoApp } from './todo-react.ts'

const originalFetch = globalThis.fetch
const originalConsoleError = console.error
const originalHTMLElement = globalThis.HTMLElement
const originalDocument = globalThis.document
const originalAddEventListener = globalThis.addEventListener

afterEach(() => {
  globalThis.fetch = originalFetch
  console.error = originalConsoleError
  globalThis.HTMLElement = originalHTMLElement
  globalThis.document = originalDocument
  globalThis.addEventListener = originalAddEventListener
  originalDocument?.body.replaceChildren()
})

function collectAttachedElementsByTag(
  node: BubbleSerializedNode,
  tag: string
): BubbleSerializedElementNode[] {
  const results: BubbleSerializedElementNode[] = []

  if (node.kind === 'element' && node.tag === tag) {
    results.push(node)
  }

  if (node.kind !== 'text') {
    for (const child of node.children) {
      results.push(...collectAttachedElementsByTag(child, tag))
    }
  }

  return results
}

function textContentOf(node: BubbleSerializedNode): string {
  if (node.kind === 'text') {
    return node.value
  }

  return node.children.map(child => textContentOf(child)).join('')
}

function createHarness(options?: Parameters<typeof mountTodoApp>[0]) {
  const app = mountTodoApp(options)
  const assertions = createSemanticAssertions({ bubble: app.bubble })

  const attachedTree = (): BubbleSerializedNode =>
    JSON.parse(
      serializeBubbleSnapshot(app.bubble.snapshot())
    ) as BubbleSerializedNode

  const findButton = (name: string): string =>
    app.bubble.snapshot().query.getByRole('button', { name })[0]!.id

  const click = (name: string): void => {
    app.bubble.dispatchEvent({ type: 'click', targetId: findButton(name) })
  }

  const changeTextbox = (name: string, value: string): void => {
    const textboxId = app.bubble
      .snapshot()
      .query.getByRole('textbox', { name })[0]!.id

    app.bubble.dispatchEvent({
      type: 'change',
      targetId: textboxId,
      data: { value },
    })
  }

  const paragraphId = (): string =>
    app.bubble.snapshot().query.getByTag('p')[0]!.id

  const attachedLis = (): BubbleSerializedElementNode[] =>
    collectAttachedElementsByTag(attachedTree(), 'li')

  const textboxValue = (name: string): string | null =>
    app.bubble.snapshot().query.getByRole('textbox', { name })[0]!.value

  return {
    app,
    assertions,
    attachedLis,
    attachedTree,
    changeTextbox,
    click,
    paragraphId,
    textboxValue,
  }
}

class FakeElement {
  textContent: string | null = ''
  childElementCount = 0

  appendChild(node: unknown): unknown {
    if (node instanceof FakeElement) {
      this.childElementCount += 1
      this.textContent = `${this.textContent ?? ''}${node.textContent ?? ''}`
    }

    return node
  }

  replaceChildren(...nodes: unknown[]): void {
    this.childElementCount = nodes.length
    this.textContent = nodes
      .map(node =>
        node instanceof FakeElement ? (node.textContent ?? '') : ''
      )
      .join('')
  }
}

function createFakeDocument(includeApp = true) {
  const app = includeApp ? new FakeElement() : null

  return {
    app,
    document: {
      createElement() {
        return new FakeElement()
      },
      getElementById(id: string) {
        return id === 'app' ? app : null
      },
    },
    isMountContainer(value: unknown): value is FakeElement {
      return value instanceof FakeElement
    },
  }
}

const defaultGlobalsTest = originalDocument === undefined ? test.skip : test

describe('mountTodoApp', () => {
  test('renders whatever the store currently holds on first mount', () => {
    const { attachedLis, attachedTree, assertions, paragraphId, textboxValue } =
      createHarness({
        initialTodos: [
          { id: 't1', label: 'Alpha', done: false },
          { id: 't2', label: 'Beta', done: true },
        ],
      })

    expect(attachedLis()).toHaveLength(2)
    const [heading] = collectAttachedElementsByTag(attachedTree(), 'h1')
    expect(heading).toBeDefined()
    expect(textContentOf(heading!)).toBe('Bubbled Todos')
    assertions.expectText(paragraphId(), '1 of 2 remaining')
    expect(textboxValue('New todo')).toBe('')
  })

  test('adds an arbitrary todo from the textbox and clears the draft', () => {
    const {
      app,
      assertions,
      attachedLis,
      changeTextbox,
      click,
      paragraphId,
      textboxValue,
    } = createHarness({
      initialTodos: [],
    })

    changeTextbox('New todo', '  Write   regression tests  ')
    click('Add todo')

    expect(app.store.get()).toEqual([
      { id: 't1', label: 'Write regression tests', done: false },
    ])
    expect(attachedLis()).toHaveLength(1)
    assertions.expectText(paragraphId(), '1 of 1 remaining')
    expect(textboxValue('New todo')).toBe('')
  })

  test('clicks flow through React props into the store, which re-renders the view', () => {
    const { app, attachedLis, assertions, click, paragraphId } = createHarness({
      initialTodos: [
        { id: 't1', label: 'Alpha', done: false },
        { id: 't2', label: 'Beta', done: true },
      ],
    })

    click('Complete Alpha')
    expect(app.store.get()[0]?.done).toBe(true)
    assertions.expectText(paragraphId(), 'All done')

    click('Undo Alpha')
    expect(app.store.get()[0]?.done).toBe(false)

    click('Remove Beta')
    const remaining = attachedLis()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.attributes['data-todo-id']).toBe('t1')

    click('Remove Alpha')
    expect(attachedLis()).toHaveLength(0)
    assertions.expectText(paragraphId(), 'No todos yet')
  })

  test('mutating the store from outside also re-renders the view', () => {
    const { app, attachedLis, assertions, paragraphId } = createHarness({
      initialTodos: [
        { id: 't1', label: 'Alpha', done: false },
        { id: 't2', label: 'Beta', done: false },
      ],
    })

    app.store.remove('t2')

    expect(attachedLis()).toHaveLength(1)
    assertions.expectText(paragraphId(), '1 of 1 remaining')
  })

  test('persists through the injected bubble storage capability across mounts', () => {
    const bubble = createBubble()
    const first = mountTodoApp({
      bubble,
      initialTodos: [{ id: 't1', label: 'Alpha', done: false }],
    })
    first.store.toggle('t1')
    first.unmount()

    const second = mountTodoApp({ bubble })
    expect(second.store.get()).toEqual([
      { id: 't1', label: 'Alpha', done: true },
    ])
    second.unmount()
  })

  test('mounts with zero options and boots an empty-but-running todo app', () => {
    const app = mountTodoApp()
    try {
      expect(app.store.get()).toEqual([])
    } finally {
      app.unmount()
    }
  })
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

    globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement

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

  defaultGlobalsTest(
    'uses the default global dependencies when no options are provided',
    async () => {
      const listeners: Array<() => void> = []
      originalDocument?.body.replaceChildren()
      const app = originalDocument?.createElement('main') ?? null

      app?.setAttribute('id', 'app')
      originalDocument?.body.appendChild(
        app ?? originalDocument!.createElement('main')
      )

      globalThis.fetch = (async () =>
        Response.json([])) as unknown as typeof fetch
      globalThis.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => {
        if (type === 'beforeunload') {
          listeners.push(listener as () => void)
        }

        return originalAddEventListener.call(
          globalThis,
          type,
          listener,
          options
        )
      }) as typeof globalThis.addEventListener

      await startTodoApp()

      expect(app?.childElementCount).toBeGreaterThan(0)
      expect(listeners).toHaveLength(1)
    }
  )
})
