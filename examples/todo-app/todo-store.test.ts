import { describe, expect, test } from 'vitest'

import type { BubbleStorage } from '../../bubble-capabilities'

import {
  appendTodo,
  createTodoStore,
  DEFAULT_STORAGE_KEY,
  normalizeTodoLabel,
  removeTodo,
  summarizeTodos,
  toggleTodo,
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

describe('pure todo helpers', () => {
  test('toggleTodo flips done for the matching item only', () => {
    const todos: readonly TodoItem[] = [
      { id: 'a', label: 'Alpha', done: false },
      { id: 'b', label: 'Beta', done: true },
    ]

    expect(toggleTodo(todos, 'a')).toEqual([
      { id: 'a', label: 'Alpha', done: true },
      { id: 'b', label: 'Beta', done: true },
    ])
  })

  test('removeTodo drops the matching item and keeps the rest', () => {
    const todos: readonly TodoItem[] = [
      { id: 'a', label: 'Alpha', done: false },
      { id: 'b', label: 'Beta', done: false },
    ]

    expect(removeTodo(todos, 'a')).toEqual([
      { id: 'b', label: 'Beta', done: false },
    ])
  })

  test('appendTodo trims labels, appends a new item, and ignores blanks', () => {
    const todos: readonly TodoItem[] = [
      { id: 't2', label: 'Existing', done: false },
    ]

    expect(normalizeTodoLabel('  Ship   it  ')).toBe('Ship it')
    expect(appendTodo(todos, '  Ship   it  ')).toEqual([
      { id: 't2', label: 'Existing', done: false },
      { id: 't3', label: 'Ship it', done: false },
    ])
    expect(appendTodo(todos, '   ')).toBe(todos)
  })

  test('summarizeTodos reports empty, partial, and complete states', () => {
    expect(summarizeTodos([])).toBe('No todos yet')
    expect(
      summarizeTodos([
        { id: 'a', label: 'A', done: false },
        { id: 'b', label: 'B', done: true },
      ])
    ).toBe('1 of 2 remaining')
    expect(summarizeTodos([{ id: 'a', label: 'A', done: true }])).toBe(
      'All done'
    )
  })
})

describe('createTodoStore', () => {
  test('starts empty when the storage is empty and no override is given', () => {
    const storage = createInMemoryStorage()
    const store = createTodoStore({ storage })

    expect(store.get()).toEqual([])
  })

  test('starts with the provided initialTodos when the storage is empty', () => {
    const storage = createInMemoryStorage()
    const initialTodos: readonly TodoItem[] = [
      { id: 'x', label: 'X', done: false },
    ]
    const store = createTodoStore({ storage, initialTodos })

    expect(store.get()).toEqual([...initialTodos])
  })

  test('hydrates from a previously persisted payload at the default key', () => {
    const persisted: readonly TodoItem[] = [
      { id: 'p', label: 'Persisted', done: true },
    ]
    const storage = createInMemoryStorage({
      [DEFAULT_STORAGE_KEY]: JSON.stringify(persisted),
    })

    const store = createTodoStore({ storage })

    expect(store.get()).toEqual([...persisted])
  })

  test('respects a custom storage key for reads and writes', () => {
    const storage = createInMemoryStorage()
    const store = createTodoStore({
      storage,
      storageKey: 'custom-key',
      initialTodos: [{ id: 'a', label: 'A', done: false }],
    })

    store.toggle('a')

    expect(storage.getItem('custom-key')).not.toBeNull()
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBeNull()
  })

  test('toggle, remove, and add persist the next state and notify subscribers', () => {
    const storage = createInMemoryStorage()
    const store = createTodoStore({
      storage,
      initialTodos: [
        { id: 'a', label: 'Alpha', done: false },
        { id: 'b', label: 'Beta', done: true },
      ],
    })
    const notifications: number[] = []
    store.subscribe(() => {
      notifications.push(notifications.length + 1)
    })

    store.toggle('a')
    expect(store.get()[0]?.done).toBe(true)

    store.remove('b')
    expect(store.get()).toHaveLength(1)

    expect(store.add('  Ship   it  ')).toBe(true)
    expect(store.get()).toEqual([
      { id: 'a', label: 'Alpha', done: true },
      { id: 't1', label: 'Ship it', done: false },
    ])
    expect(store.add('   ')).toBe(false)

    expect(notifications).toHaveLength(3)

    const persisted = storage.getItem(DEFAULT_STORAGE_KEY)
    expect(persisted).not.toBeNull()
    expect(JSON.parse(persisted as string)).toEqual([...store.get()])
  })

  test('subscribe returns an unsubscribe that stops further notifications', () => {
    const storage = createInMemoryStorage()
    const store = createTodoStore({
      storage,
      initialTodos: [{ id: 'a', label: 'Alpha', done: false }],
    })

    let notified = 0
    const unsubscribe = store.subscribe(() => {
      notified += 1
    })

    store.toggle('a')
    expect(notified).toBe(1)

    unsubscribe()
    store.toggle('a')
    expect(notified).toBe(1)
  })
})
