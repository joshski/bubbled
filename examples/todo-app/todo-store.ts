import type { BubbleStorage } from '../../bubble-capabilities'

export interface TodoItem {
  readonly id: string
  readonly label: string
  readonly done: boolean
}

export const DEFAULT_STORAGE_KEY = 'bubbled-todos'

export function toggleTodo(
  todos: readonly TodoItem[],
  id: string
): readonly TodoItem[] {
  return todos.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo
  )
}

export function removeTodo(
  todos: readonly TodoItem[],
  id: string
): readonly TodoItem[] {
  return todos.filter(todo => todo.id !== id)
}

export function normalizeTodoLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ')
}

function createNextTodoId(todos: readonly TodoItem[]): string {
  let maxId = 0

  for (const todo of todos) {
    const match = /^t(\d+)$/.exec(todo.id)

    if (match === null) {
      continue
    }

    maxId = Math.max(maxId, Number(match[1]))
  }

  return `t${maxId + 1}`
}

export function appendTodo(
  todos: readonly TodoItem[],
  label: string
): readonly TodoItem[] {
  const normalizedLabel = normalizeTodoLabel(label)

  if (normalizedLabel.length === 0) {
    return todos
  }

  return [
    ...todos,
    {
      id: createNextTodoId(todos),
      label: normalizedLabel,
      done: false,
    },
  ]
}

export function summarizeTodos(todos: readonly TodoItem[]): string {
  const remaining = todos.filter(todo => !todo.done).length
  if (todos.length === 0) {
    return 'No todos yet'
  }
  if (remaining === 0) {
    return 'All done'
  }
  return `${remaining} of ${todos.length} remaining`
}

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
