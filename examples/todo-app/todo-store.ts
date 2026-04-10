import type { BubbleStorage } from '../../bubble-capabilities'

export interface TodoItem {
  readonly id: string
  readonly label: string
  readonly done: boolean
}

export const INITIAL_TODOS: readonly TodoItem[] = Object.freeze([
  Object.freeze({ id: 't1', label: 'Write the README', done: true }),
  Object.freeze({ id: 't2', label: 'Sketch the todo example', done: false }),
])

export const SAMPLE_TODO_LABELS: readonly string[] = Object.freeze([
  'Taste the bubble tea',
  'Bridge a DOM event',
  'Inspect the snapshot',
  'Ship a tiny slice',
])

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

export function appendSampleTodo(
  todos: readonly TodoItem[],
  cycle: number
): readonly TodoItem[] {
  const label = SAMPLE_TODO_LABELS[cycle % SAMPLE_TODO_LABELS.length] as string
  const nextId = `t${todos.length + 1 + cycle}`
  return [...todos, { id: nextId, label, done: false }]
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
  addSample(): void
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
    todos = options.initialTodos ?? INITIAL_TODOS
  } else {
    todos = JSON.parse(rawStored) as readonly TodoItem[]
  }

  let cycle = 0

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
    addSample() {
      const nextCycle = cycle
      cycle += 1
      persist(appendSampleTodo(todos, nextCycle))
    },
  }
}
