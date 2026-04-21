import type { ReactNode } from 'react'

import type { TextInputProps } from '../../../bubble-react'

import {
  normalizeTodoLabel,
  summarizeTodos,
  type TodoItem,
} from '../domain/todos.ts'

export interface TodoAppViewProps {
  readonly todos: readonly TodoItem[]
  readonly draftInput: TextInputProps
  readonly onToggle: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onAdd: () => void
}

export function TodoAppView(props: TodoAppViewProps): ReactNode {
  const canAdd = normalizeTodoLabel(props.draftInput.value).length > 0
  return (
    <section>
      <h1>Bubbled Todos</h1>
      <p>{summarizeTodos(props.todos)}</p>
      <div>
        <input type="text" aria-label="New todo" {...props.draftInput} />
        <button type="button" disabled={!canAdd} onClick={props.onAdd}>
          Add todo
        </button>
      </div>
      <ul>
        {props.todos.map(todo => (
          <li
            key={todo.id}
            data-todo-id={todo.id}
            data-done={todo.done ? 'true' : 'false'}
          >
            <button
              type="button"
              aria-label={`${todo.done ? 'Undo' : 'Complete'} ${todo.label}`}
              onClick={() => {
                props.onToggle(todo.id)
              }}
            >
              {todo.done ? 'Undo' : 'Done'}
            </button>
            <span>{todo.label}</span>
            <button
              type="button"
              aria-label={`Remove ${todo.label}`}
              onClick={() => {
                props.onRemove(todo.id)
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
