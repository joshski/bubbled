import { createBubble, type BubbleRuntime } from '../../bubble-core'
import { createBubbleReactRoot, type BubbleReactRoot } from '../../bubble-react'

import { TodoAppView } from './todo-app.tsx'
import {
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
    root.render(
      <TodoAppView
        todos={store.get()}
        onToggle={id => {
          store.toggle(id)
        }}
        onRemove={id => {
          store.remove(id)
        }}
        onAdd={() => {
          store.addSample()
        }}
      />
    )
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
