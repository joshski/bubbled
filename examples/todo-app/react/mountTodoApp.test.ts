import { describe, expect, test } from 'vitest'

import { createBubble } from '../../../bubble-core'
import {
  createSemanticAssertions,
  createSemanticInteractions,
  createSemanticQueries,
} from '../../../bubble-test'
import { mountTodoApp } from './mountTodoApp.ts'

function createHarness(options?: Parameters<typeof mountTodoApp>[0]) {
  const app = mountTodoApp(options)
  const context = { bubble: app.bubble }
  const assertions = createSemanticAssertions(context)
  const interactions = createSemanticInteractions(context)
  const queries = createSemanticQueries(context)

  const click = (name: string): void => {
    interactions.clickByRole('button', { name })
  }

  const type = (name: string, value: string): void => {
    interactions.typeByRole('textbox', { name }, value)
  }

  const paragraphId = (): string =>
    app.bubble.snapshot().query.getByTag('p')[0]!.id

  const attachedLis = () =>
    app.bubble.snapshot().query.getByTag('li').filter(n => n.parentId !== null)

  const textboxValue = (name: string): string | null =>
    queries.getValueByRole('textbox', { name })

  return {
    app,
    assertions,
    attachedLis,
    type,
    click,
    paragraphId,
    textboxValue,
  }
}

describe('mountTodoApp', () => {
  test('renders whatever the store currently holds on first mount', () => {
    const { app, attachedLis, assertions, paragraphId, textboxValue } =
      createHarness({
        initialTodos: [
          { id: 't1', label: 'Alpha', done: false },
          { id: 't2', label: 'Beta', done: true },
        ],
      })

    expect(attachedLis()).toHaveLength(2)
    const heading = app.bubble.snapshot().query.getByTag('h1')[0]
    expect(heading).toBeDefined()
    assertions.expectText(heading!.id, 'Bubbled Todos')
    assertions.expectText(paragraphId(), '1 of 2 remaining')
    expect(textboxValue('New todo')).toBe('')
  })

  test('adds an arbitrary todo from the textbox and clears the draft', () => {
    const {
      app,
      assertions,
      attachedLis,
      type,
      click,
      paragraphId,
      textboxValue,
    } = createHarness({
      initialTodos: [],
    })

    type('New todo', '  Write   regression tests  ')
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
    const { app, type } = createHarness({ initialTodos: [] })

    type('New todo', '  ')
    expect(
      app.bubble.snapshot().query.getByRole('button', { name: 'Add todo' })[0]!
        .properties
    ).toEqual({ disabled: true })

    type('New todo', 'Ship it')
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
