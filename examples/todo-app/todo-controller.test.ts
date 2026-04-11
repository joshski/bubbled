import { describe, expect, test } from 'bun:test'

import type { BubbleStorage } from '../../bubble-capabilities'

import {
  createTodoAppController,
  createTodoAppSnapshot,
} from './todo-controller.ts'
import {
  createTodoStore,
  SAMPLE_TODO_LABELS,
  type TodoItem,
} from './todo-store.ts'

function createInMemoryStorage(
  seed: Record<string, string> = {}
): BubbleStorage {
  const entries = new Map<string, string>(Object.entries(seed))

  return {
    getItem(key) {
      return entries.get(key) ?? null
    },
    setItem(key, value) {
      entries.set(key, value)
    },
    removeItem(key) {
      entries.delete(key)
    },
    clear() {
      entries.clear()
    },
  }
}

describe('createTodoAppSnapshot', () => {
  test('derives summary and accessible labels outside of React', () => {
    const snapshot = createTodoAppSnapshot([
      { id: 'a', label: 'Alpha', done: false },
      { id: 'b', label: 'Beta', done: true },
    ])

    expect(snapshot.heading).toBe('Bubbled Todos')
    expect(snapshot.summary).toBe('1 of 2 remaining')
    expect(snapshot.addLabel).toBe('Add sample todo')
    expect(snapshot.todos).toEqual([
      {
        id: 'a',
        label: 'Alpha',
        done: false,
        toggleLabel: 'Complete Alpha',
        toggleText: 'Done',
        removeLabel: 'Remove Alpha',
      },
      {
        id: 'b',
        label: 'Beta',
        done: true,
        toggleLabel: 'Undo Beta',
        toggleText: 'Undo',
        removeLabel: 'Remove Beta',
      },
    ])
  })
})

describe('createTodoAppController', () => {
  test('delegates commands to the store and exposes updated snapshots', () => {
    const store = createTodoStore({
      storage: createInMemoryStorage(),
      initialTodos: [
        { id: 'a', label: 'Alpha', done: false },
        { id: 'b', label: 'Beta', done: true },
      ],
    })
    const controller = createTodoAppController(store)

    controller.toggle('a')
    expect(controller.getSnapshot().summary).toBe('All done')

    controller.remove('b')
    expect(controller.getSnapshot().todos).toHaveLength(1)

    controller.addSample()
    controller.addSample()

    const snapshot = controller.getSnapshot()
    expect(snapshot.todos).toHaveLength(3)
    expect(snapshot.todos[1]?.label).toBe(SAMPLE_TODO_LABELS[0] ?? '')
    expect(snapshot.todos[2]?.label).toBe(SAMPLE_TODO_LABELS[1] ?? '')
  })

  test('tracks store updates triggered outside the controller adapter', () => {
    const initialTodos: readonly TodoItem[] = [
      { id: 'a', label: 'Alpha', done: false },
    ]
    const store = createTodoStore({
      storage: createInMemoryStorage(),
      initialTodos,
    })
    const controller = createTodoAppController(store)

    const notifications: number[] = []
    const unsubscribe = controller.subscribe(() => {
      notifications.push(notifications.length + 1)
    })

    store.addSample()

    expect(controller.getSnapshot().summary).toBe('2 of 2 remaining')
    expect(controller.getSnapshot().todos).toHaveLength(2)
    expect(notifications).toEqual([1])

    unsubscribe()
    store.toggle('a')
    expect(notifications).toEqual([1])
  })
})
