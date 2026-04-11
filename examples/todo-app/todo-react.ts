import { createElement, useState } from 'react'

import { createBubble, type BubbleRuntime } from '../../bubble-core'
import {
  createBubbleReactRoot,
  valueChangeHandler,
  type BubbleReactRoot,
} from '../../bubble-react'
import { TodoAppView } from './todo-app.tsx'
import {
  createTodoAppSnapshot,
  createTodoStore,
  type CreateTodoStoreOptions,
  type TodoItem,
  type TodoStore,
} from './todo-store.ts'

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
    snapshot: createTodoAppSnapshot(props.store.get(), draft),
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
