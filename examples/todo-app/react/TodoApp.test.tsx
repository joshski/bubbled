import { describe, expect, test } from 'vitest'

import { createInMemoryStorage, createReactHarness } from '../../../bubble-test'
import { TodoApp, DEFAULT_STORAGE_KEY } from './TodoApp.tsx'

function createTodoHarness(
  options: Partial<Parameters<typeof TodoApp>[0]> = {}
) {
  const storage = options.storage ?? createInMemoryStorage()
  const harness = createReactHarness(
    <TodoApp
      initialTodos={options.initialTodos}
      storage={storage}
      storageKey={options.storageKey}
    />
  )

  const attachedLis = () =>
    harness.bubble
      .snapshot()
      .query.getByTag('li')
      .filter(node => node.parentId !== null)

  const paragraphId = () => harness.bubble.snapshot().query.getByTag('p')[0]!.id

  return {
    harness,
    storage,
    attachedLis,
    paragraphId,
  }
}

describe('TodoApp', () => {
  test('renders the provided initial todos on first mount', () => {
    const { harness, attachedLis, paragraphId } = createTodoHarness({
      initialTodos: [
        { id: 't1', label: 'Alpha', done: false },
        { id: 't2', label: 'Beta', done: true },
      ],
    })

    expect(attachedLis()).toHaveLength(2)
    expect(harness.getValueByRole('textbox', { name: 'New todo' })).toBe('')
    harness.expectText(paragraphId(), '1 of 2 remaining')
  })

  test('adds a todo from the textbox and clears the draft', () => {
    const { harness, attachedLis, paragraphId, storage } = createTodoHarness()

    harness.typeByRole('textbox', { name: 'New todo' }, '  Write   tests  ')
    harness.clickByRole('button', { name: 'Add todo' })

    expect(attachedLis()).toHaveLength(1)
    expect(harness.getValueByRole('textbox', { name: 'New todo' })).toBe('')
    harness.expectText(paragraphId(), '1 of 1 remaining')
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBe(
      JSON.stringify([{ id: 't1', label: 'Write tests', done: false }])
    )
  })

  test('keeps the add button disabled for blank drafts', () => {
    const { harness, attachedLis, paragraphId } = createTodoHarness()

    harness.typeByRole('textbox', { name: 'New todo' }, '   ')

    expect(
      harness.bubble
        .snapshot()
        .query.getByRole('button', { name: 'Add todo' })[0]?.properties
    ).toEqual({ disabled: true })

    harness.clickByRole('button', { name: 'Add todo' })

    expect(attachedLis()).toHaveLength(0)
    harness.expectText(paragraphId(), 'No todos yet')
  })

  test('toggles and removes todos through button clicks', () => {
    const { harness, attachedLis, paragraphId } = createTodoHarness({
      initialTodos: [
        { id: 't1', label: 'Alpha', done: false },
        { id: 't2', label: 'Beta', done: true },
      ],
    })

    harness.clickByRole('button', { name: 'Complete Alpha' })
    harness.expectText(paragraphId(), 'All done')

    harness.clickByRole('button', { name: 'Remove Beta' })
    expect(attachedLis()).toHaveLength(1)

    harness.clickByRole('button', { name: 'Remove Alpha' })
    expect(attachedLis()).toHaveLength(0)
    harness.expectText(paragraphId(), 'No todos yet')
  })

  test('hydrates from storage and persists across mounts', () => {
    const storage = createInMemoryStorage({
      [DEFAULT_STORAGE_KEY]: JSON.stringify([
        { id: 't1', label: 'Persisted', done: false },
      ]),
    })

    const first = createTodoHarness({ storage })
    first.harness.clickByRole('button', { name: 'Complete Persisted' })
    first.harness.cleanup()

    const second = createTodoHarness({ storage })

    second.harness.expectText(second.paragraphId(), 'All done')
    expect(second.attachedLis()).toHaveLength(1)
  })
})
