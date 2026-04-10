import { describe, expect, test } from 'bun:test'

import {
  createBubble,
  serializeBubbleSnapshot,
  type BubbleSerializedElementNode,
  type BubbleSerializedNode,
} from '../../bubble-core'
import { createSemanticAssertions } from '../../bubble-test'
import { mountTodoApp } from './mount.tsx'
import { SAMPLE_TODO_LABELS } from './todo-store.ts'

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

  const paragraphId = (): string =>
    app.bubble.snapshot().query.getByTag('p')[0]!.id

  const attachedLis = (): BubbleSerializedElementNode[] =>
    collectAttachedElementsByTag(attachedTree(), 'li')

  return { app, assertions, attachedLis, attachedTree, click, paragraphId }
}

describe('mountTodoApp', () => {
  test('renders whatever the store currently holds on first mount', () => {
    const { attachedLis, attachedTree, assertions, paragraphId } =
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

  test("'Add sample todo' clicks cycle through the sample labels via the store", () => {
    const { attachedLis, attachedTree, click } = createHarness({
      initialTodos: [],
    })

    for (let index = 0; index < SAMPLE_TODO_LABELS.length + 1; index += 1) {
      click('Add sample todo')
    }

    expect(attachedLis()).toHaveLength(SAMPLE_TODO_LABELS.length + 1)

    const renderedLabels = collectAttachedElementsByTag(
      attachedTree(),
      'span'
    ).map(span => textContentOf(span))

    expect(renderedLabels).toEqual([
      SAMPLE_TODO_LABELS[0]!,
      SAMPLE_TODO_LABELS[1]!,
      SAMPLE_TODO_LABELS[2]!,
      SAMPLE_TODO_LABELS[3]!,
      SAMPLE_TODO_LABELS[0]!,
    ])
  })

  test('mutating the store from outside also re-renders the view', () => {
    const { app, attachedLis, assertions, paragraphId } = createHarness({
      initialTodos: [{ id: 't1', label: 'Alpha', done: false }],
    })

    app.store.addSample()

    expect(attachedLis()).toHaveLength(2)
    assertions.expectText(paragraphId(), '2 of 2 remaining')
  })

  test('persists through the injected bubble storage capability across mounts', () => {
    const bubble = createBubble()
    const first = mountTodoApp({
      bubble,
      initialTodos: [{ id: 't1', label: 'Alpha', done: false }],
    })
    first.store.addSample()
    first.unmount()

    const second = mountTodoApp({ bubble })
    expect(second.store.get()).toHaveLength(2)
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
