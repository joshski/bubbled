import { describe, expect, test } from 'vitest'

import type { BubbleStorage } from '../../bubble-capabilities'

import {
  createTodoStore,
  DEFAULT_STORAGE_KEY,
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
      { id: 't2', label: 'Ship it', done: false },
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
