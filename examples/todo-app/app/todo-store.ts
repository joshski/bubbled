import type { BubbleStorage } from '../../../bubble-capabilities'
import {
  appendTodo,
  removeTodo,
  toggleTodo,
  type TodoItem,
} from '../domain/todos.ts'

export type { TodoItem } from '../domain/todos.ts'

export const DEFAULT_STORAGE_KEY = 'bubbled-todos'

export interface TodoStore {
  get(): readonly TodoItem[]
  subscribe(listener: () => void): () => void
  toggle(id: string): void
  remove(id: string): void
  add(label: string): boolean
}

export interface CreateTodoStoreOptions {
  readonly storage: BubbleStorage
  readonly storageKey?: string
  readonly initialTodos?: readonly TodoItem[]
}

export function createTodoStore(options: CreateTodoStoreOptions): TodoStore {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
  const listeners = new Set<() => void>()
  const rawStored = options.storage.getItem(storageKey)

  let todos: readonly TodoItem[]
  if (rawStored === null) {
    todos = options.initialTodos ?? []
  } else {
    todos = JSON.parse(rawStored) as readonly TodoItem[]
  }

  const persist = (next: readonly TodoItem[]): void => {
    todos = next
    options.storage.setItem(storageKey, JSON.stringify(todos))
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    get(): readonly TodoItem[] {
      return todos
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    toggle(id) {
      persist(toggleTodo(todos, id))
    },
    remove(id) {
      persist(removeTodo(todos, id))
    },
    add(label) {
      const next = appendTodo(todos, label)

      if (next === todos) {
        return false
      }

      persist(next)
      return true
    },
  }
}
