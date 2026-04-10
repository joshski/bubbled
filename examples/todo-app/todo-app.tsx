import type { ReactNode } from "react";

import { summarizeTodos, type TodoItem } from "./todo-store.ts";

export interface TodoAppViewProps {
  readonly todos: readonly TodoItem[];
  readonly onToggle: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onAdd: () => void;
}

export function TodoAppView(props: TodoAppViewProps): ReactNode {
  return (
    <section>
      <h1>Bubbled Todos</h1>
      <p>{summarizeTodos(props.todos)}</p>
      <button type="button" onClick={props.onAdd}>
        Add sample todo
      </button>
      <ul>
        {props.todos.map((todo) => (
          <li key={todo.id} data-todo-id={todo.id} data-done={todo.done ? "true" : "false"}>
            <button
              type="button"
              aria-label={`${todo.done ? "Undo" : "Complete"} ${todo.label}`}
              onClick={() => {
                props.onToggle(todo.id);
              }}
            >
              {todo.done ? "Undo" : "Done"}
            </button>
            <span>{todo.label}</span>
            <button
              type="button"
              aria-label={`Remove ${todo.label}`}
              onClick={() => {
                props.onRemove(todo.id);
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
