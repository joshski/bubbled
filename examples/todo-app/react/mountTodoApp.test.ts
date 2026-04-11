import { describe, expect, test } from 'vitest'

import {
  createBubble,
  serializeBubbleSnapshot,
  type BubbleSerializedElementNode,
  type BubbleSerializedNode,
} from '../../../bubble-core'
import { createSemanticAssertions, createSemanticInteractions } from '../../../bubble-test'
import { mountTodoApp } from './mountTodoApp.ts'

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

  const interactions = createSemanticInteractions({ bubble: app.bubble })

  const click = (name: string): void => {
    interactions.clickByRole('button', { name })
  }

  const changeTextbox = (name: string, value: string): void => {
    interactions.changeByRole('textbox', { name }, value)
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

  test('ignores blank add requests and keeps the draft empty', () => {
    const { app, attachedLis, click, paragraphId, textboxValue } =
      createHarness({
        initialTodos: [],
      })

    click('Add todo')

    expect(app.store.get()).toEqual([])
    expect(attachedLis()).toHaveLength(0)
    expect(textboxValue('New todo')).toBe('')
    expect(
      app.bubble.snapshot().query.getByRole('button', { name: 'Add todo' })[0]!
        .properties
    ).toEqual({
      disabled: true,
    })
    createSemanticAssertions({ bubble: app.bubble }).expectText(
      paragraphId(),
      'No todos yet'
    )
  })

  test('enables the add button once the draft has visible content', () => {
    const { app, changeTextbox } = createHarness({ initialTodos: [] })

    changeTextbox('New todo', '  ')
    expect(
      app.bubble.snapshot().query.getByRole('button', { name: 'Add todo' })[0]!
        .properties
    ).toEqual({ disabled: true })

    changeTextbox('New todo', 'Ship it')
    expect(
      app.bubble.snapshot().query.getByRole('button', { name: 'Add todo' })[0]!
        .properties
    ).toEqual({ disabled: false })
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

  test('missing change payloads normalize the draft back to an empty string', () => {
    const { app, textboxValue } = createHarness({
      initialTodos: [],
    })
    const textboxId = app.bubble.snapshot().query.getByRole('textbox', {
      name: 'New todo',
    })[0]!.id

    app.bubble.dispatchEvent({
      type: 'change',
      targetId: textboxId,
      data: { value: 'Draft' },
    })
    app.bubble.dispatchEvent({
      type: 'change',
      targetId: textboxId,
      data: {},
    })

    expect(textboxValue('New todo')).toBe('')
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
