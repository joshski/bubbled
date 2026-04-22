import { useState, type ChangeEvent, type ReactNode } from 'react'

import { useStorage } from '../../../bubble-react'
import {
  appendTodo,
  normalizeTodoLabel,
  removeTodo,
  summarizeTodos,
  toggleTodo,
  type TodoItem,
} from '../domain/todos.ts'

export const DEFAULT_STORAGE_KEY = 'bubbled-todos'

export interface TodoAppProps {
  readonly initialTodos?: readonly TodoItem[]
  readonly storageKey?: string
}

function readInitialTodos(
  storage: ReturnType<typeof useStorage>,
  storageKey: string,
  initialTodos: readonly TodoItem[]
): readonly TodoItem[] {
  const rawStored = storage.getItem(storageKey)

  if (rawStored === null) {
    return [...initialTodos]
  }

  return JSON.parse(rawStored) as readonly TodoItem[]
}

function persistTodos(
  storage: ReturnType<typeof useStorage>,
  storageKey: string,
  todos: readonly TodoItem[]
): void {
  storage.setItem(storageKey, JSON.stringify(todos))
}

export function TodoApp(props: TodoAppProps): ReactNode {
  const storage = useStorage()
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY
  const [todos, setTodos] = useState(() =>
    readInitialTodos(storage, storageKey, props.initialTodos ?? [])
  )
  const [draft, setDraft] = useState('')
  const canAdd = normalizeTodoLabel(draft).length > 0

  const updateTodos = (nextTodos: readonly TodoItem[]): void => {
    setTodos(nextTodos)
    persistTodos(storage, storageKey, nextTodos)
  }

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.currentTarget.value)
  }

  return (
    <section>
      <h1>Bubbled Todos</h1>
      <p>{summarizeTodos(todos)}</p>
      <div>
        <input
          type="text"
          aria-label="New todo"
          value={draft}
          onChange={handleDraftChange}
        />
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            const nextTodos = appendTodo(todos, draft)

            if (nextTodos === todos) {
              return
            }

            updateTodos(nextTodos)
            setDraft('')
          }}
        >
          Add todo
        </button>
      </div>
      <ul>
        {todos.map(todo => (
          <li
            key={todo.id}
            data-todo-id={todo.id}
            data-done={todo.done ? 'true' : 'false'}
          >
            <button
              type="button"
              aria-label={`${todo.done ? 'Undo' : 'Complete'} ${todo.label}`}
              onClick={() => {
                updateTodos(toggleTodo(todos, todo.id))
              }}
            >
              {todo.done ? 'Undo' : 'Done'}
            </button>
            <span>{todo.label}</span>
            <button
              type="button"
              aria-label={`Remove ${todo.label}`}
              onClick={() => {
                updateTodos(removeTodo(todos, todo.id))
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
