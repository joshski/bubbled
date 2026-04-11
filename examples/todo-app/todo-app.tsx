import type { ReactNode } from 'react'

import type { BubbleEvent } from '../../bubble-core'
import type { TodoAppSnapshot } from './todo-store.ts'

import { bubbleEventStringValue } from './todo-react.ts'

export interface TodoAppViewProps {
  readonly snapshot: TodoAppSnapshot
  readonly draft: string
  readonly onDraftChange: (draft: string) => void
  readonly onToggle: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onAdd: () => void
}

export function TodoAppView(props: TodoAppViewProps): ReactNode {
  return (
    <section>
      <h1>{props.snapshot.heading}</h1>
      <p>{props.snapshot.summary}</p>
      <div>
        <input
          type="text"
          aria-label={props.snapshot.newTodoLabel}
          value={props.draft}
          onChange={event => {
            props.onDraftChange(
              bubbleEventStringValue(event as unknown as BubbleEvent)
            )
          }}
        />
        <button
          type="button"
          disabled={props.draft.trim().length === 0}
          onClick={props.onAdd}
        >
          {props.snapshot.addButtonLabel}
        </button>
      </div>
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
