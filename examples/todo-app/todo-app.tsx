import type { ReactNode } from 'react'

import type { TodoAppSnapshot } from './todo-controller.ts'

export interface TodoAppViewProps {
  readonly snapshot: TodoAppSnapshot
  readonly onToggle: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onAdd: () => void
}

export function TodoAppView(props: TodoAppViewProps): ReactNode {
  return (
    <section>
      <h1>{props.snapshot.heading}</h1>
      <p>{props.snapshot.summary}</p>
      <button type="button" onClick={props.onAdd}>
        {props.snapshot.addLabel}
      </button>
      <ul>
        {props.snapshot.todos.map(todo => (
          <li
            key={todo.id}
            data-todo-id={todo.id}
            data-done={todo.done ? 'true' : 'false'}
          >
            <button
              type="button"
              aria-label={todo.toggleLabel}
              onClick={() => {
                props.onToggle(todo.id)
              }}
            >
              {todo.toggleText}
            </button>
            <span>{todo.label}</span>
            <button
              type="button"
              aria-label={todo.removeLabel}
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
