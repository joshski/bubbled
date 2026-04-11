import type { ChangeEventHandler, ReactNode } from 'react'

import { createElement, useState } from 'react'

import { createBubble, type BubbleRuntime } from '../../bubble-core'
import {
  createBubbleReactRoot,
  valueChangeHandler,
  type BubbleReactRoot,
} from '../../bubble-react'
import {
  createTodoStore,
  type CreateTodoStoreOptions,
  type TodoItem,
  type TodoStore,
} from './todo-store.ts'

function summarizeTodos(todos: readonly TodoItem[]): string {
  const remaining = todos.filter(todo => !todo.done).length
  if (todos.length === 0) {
    return 'No todos yet'
  }
  if (remaining === 0) {
    return 'All done'
  }
  return `${remaining} of ${todos.length} remaining`
}

function normalizeTodoLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ')
}

interface TodoAppViewProps {
  readonly todos: readonly TodoItem[]
  readonly draft: string
  readonly onDraftChange: ChangeEventHandler<HTMLInputElement>
  readonly onToggle: (id: string) => void
  readonly onRemove: (id: string) => void
  readonly onAdd: () => void
}

function TodoAppView(props: TodoAppViewProps): ReactNode {
  const canAdd = normalizeTodoLabel(props.draft).length > 0
  return createElement(
    'section',
    null,
    createElement('h1', null, 'Bubbled Todos'),
    createElement('p', null, summarizeTodos(props.todos)),
    createElement(
      'div',
      null,
      createElement('input', {
        type: 'text',
        'aria-label': 'New todo',
        value: props.draft,
        onChange: props.onDraftChange,
      }),
      createElement(
        'button',
        {
          type: 'button',
          disabled: !canAdd,
          onClick: props.onAdd,
        },
        'Add todo'
      )
    ),
    createElement(
      'ul',
      null,
      ...props.todos.map(todo =>
        createElement(
          'li',
          {
            key: todo.id,
            'data-todo-id': todo.id,
            'data-done': todo.done ? 'true' : 'false',
          },
          createElement(
            'button',
            {
              type: 'button',
              'aria-label': `${todo.done ? 'Undo' : 'Complete'} ${todo.label}`,
              onClick: () => {
                props.onToggle(todo.id)
              },
            },
            todo.done ? 'Undo' : 'Done'
          ),
          createElement('span', null, todo.label),
          createElement(
            'button',
            {
              type: 'button',
              'aria-label': `Remove ${todo.label}`,
              onClick: () => {
                props.onRemove(todo.id)
              },
            },
            'Remove'
          )
        )
      )
    )
  )
}

export interface MountTodoAppOptions {
  readonly bubble?: BubbleRuntime
  readonly store?: TodoStore
  readonly initialTodos?: readonly TodoItem[]
  readonly storageKey?: CreateTodoStoreOptions['storageKey']
}

export interface MountedTodoApp {
  readonly bubble: BubbleRuntime
  readonly store: TodoStore
  readonly root: BubbleReactRoot
  unmount(): void
}

interface TodoAppRootProps {
  readonly store: TodoStore
}

function TodoAppRoot(props: TodoAppRootProps) {
  const [draft, setDraft] = useState('')

  return createElement(TodoAppView, {
    todos: props.store.get(),
    draft,
    onDraftChange: valueChangeHandler(setDraft),
    onToggle(id: string) {
      props.store.toggle(id)
    },
    onRemove(id: string) {
      props.store.remove(id)
    },
    onAdd() {
      if (props.store.add(draft)) {
        setDraft('')
      }
    },
  })
}

export function mountTodoApp(
  options: MountTodoAppOptions = {}
): MountedTodoApp {
  const bubble = options.bubble ?? createBubble()
  const store =
    options.store ??
    createTodoStore({
      storage: bubble.resolveCapability('storage'),
      initialTodos: options.initialTodos,
      storageKey: options.storageKey,
    })
  const root = createBubbleReactRoot({ bubble })

  const render = (): void => {
    root.render(createElement(TodoAppRoot, { store }))
  }

  const unsubscribe = store.subscribe(render)
  render()

  return {
    bubble,
    store,
    root,
    unmount(): void {
      unsubscribe()
      root.unmount()
    },
  }
}
