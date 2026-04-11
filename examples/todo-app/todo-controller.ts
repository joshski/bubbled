import { summarizeTodos, type TodoItem, type TodoStore } from './todo-store.ts'

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
  readonly todos: readonly TodoViewItem[]
}

export interface TodoAppController {
  getSnapshot(): TodoAppSnapshot
  subscribe(listener: () => void): () => void
  toggle(id: string): void
  remove(id: string): void
  add(label: string): boolean
}

export function createTodoAppSnapshot(
  todos: readonly TodoItem[]
): TodoAppSnapshot {
  return {
    heading: 'Bubbled Todos',
    summary: summarizeTodos(todos),
    addButtonLabel: 'Add todo',
    newTodoLabel: 'New todo',
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

export function createTodoAppController(store: TodoStore): TodoAppController {
  return {
    getSnapshot() {
      return createTodoAppSnapshot(store.get())
    },
    subscribe(listener) {
      return store.subscribe(listener)
    },
    toggle(id) {
      store.toggle(id)
    },
    remove(id) {
      store.remove(id)
    },
    add(label) {
      return store.add(label)
    },
  }
}
