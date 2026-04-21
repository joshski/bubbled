import { createElement, useState } from 'react'

import type { TodoItem } from '../domain/todos.ts'

import { createBubble, type BubbleRuntime } from '../../../bubble-core'
import {
  createBubbleReactRoot,
  textInput,
  type BubbleReactRoot,
} from '../../../bubble-react'
import {
  createTodoStore,
  type CreateTodoStoreOptions,
  type TodoStore,
} from '../app/todo-store.ts'
import { TodoAppView } from './TodoAppView.tsx'

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
    draftInput: textInput(draft, setDraft),
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
