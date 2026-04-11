export interface TodoItem {
  readonly id: string
  readonly label: string
  readonly done: boolean
}

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
