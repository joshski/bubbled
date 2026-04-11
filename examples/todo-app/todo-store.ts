import type { BubbleStorage } from '../../bubble-capabilities'

export interface TodoItem {
  readonly id: string
  readonly label: string
  readonly done: boolean
}

export const DEFAULT_STORAGE_KEY = 'bubbled-todos'

function toggleTodo(
  todos: readonly TodoItem[],
  id: string
): readonly TodoItem[] {
  return todos.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo
  )
}

function removeTodo(
  todos: readonly TodoItem[],
  id: string
): readonly TodoItem[] {
  return todos.filter(todo => todo.id !== id)
}

function normalizeTodoLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ')
}

function appendTodo(
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
      id: `t${todos.length + 1}`,
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

export interface TodoViewItem {
  readonly id: string
  readonly label: string
  readonly done: boolean
  readonly toggleLabel: string
  readonly toggleText: string
  readonly removeLabel: string
}

export interface TodoAppSnapshot {
  readonly heading: string
  readonly summary: string
  readonly addButtonLabel: string
  readonly newTodoLabel: string
  readonly canAdd: boolean
  readonly todos: readonly TodoViewItem[]
}

export function createTodoAppSnapshot(
  todos: readonly TodoItem[],
  draft: string
): TodoAppSnapshot {
  return {
    heading: 'Bubbled Todos',
    summary: summarizeTodos(todos),
    addButtonLabel: 'Add todo',
    newTodoLabel: 'New todo',
    canAdd: normalizeTodoLabel(draft).length > 0,
    todos: todos.map(todo => ({
      id: todo.id,
      label: todo.label,
      done: todo.done,
      toggleLabel: `${todo.done ? 'Undo' : 'Complete'} ${todo.label}`,
      toggleText: todo.done ? 'Undo' : 'Done',
      removeLabel: `Remove ${todo.label}`,
    })),
  }
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
