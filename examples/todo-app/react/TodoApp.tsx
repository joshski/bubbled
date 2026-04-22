import { useState, type ReactNode } from 'react'

import type { BubbleStorage } from '../../../bubble-capabilities'

import { textInput } from '../../../bubble-react'
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
  readonly storage: BubbleStorage
  readonly initialTodos?: readonly TodoItem[]
  readonly storageKey?: string
}

function readInitialTodos(
  storage: BubbleStorage,
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
  storage: BubbleStorage,
  storageKey: string,
  todos: readonly TodoItem[]
): void {
  storage.setItem(storageKey, JSON.stringify(todos))
}

export function TodoApp(props: TodoAppProps): ReactNode {
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY
  const [todos, setTodos] = useState(() =>
    readInitialTodos(props.storage, storageKey, props.initialTodos ?? [])
  )
  const [draft, setDraft] = useState('')
  const draftInput = textInput(draft, setDraft)
  const canAdd = normalizeTodoLabel(draftInput.value).length > 0

  const updateTodos = (nextTodos: readonly TodoItem[]): void => {
    setTodos(nextTodos)
    persistTodos(props.storage, storageKey, nextTodos)
  }

  return (
    <section>
      <h1>Bubbled Todos</h1>
      <p>{summarizeTodos(todos)}</p>
      <div>
        <input type="text" aria-label="New todo" {...draftInput} />
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
