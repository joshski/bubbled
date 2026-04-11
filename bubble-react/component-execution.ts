import type { Dispatch, ReactNode, SetStateAction } from 'react'

import type {
  BubbleReactClientInternals,
  BubbleReactHookDispatcher,
} from './react-client-internals'

import {
  UNSUPPORTED_REACT_HOOK_ERROR,
  UNSUPPORTED_REACT_NODE_TYPE_ERROR,
} from './planner-errors'

interface BubbleReactHookState<TValue> {
  value: TValue
  setValue: Dispatch<SetStateAction<TValue>>
}

export interface BubbleReactComponentState {
  hooks: unknown[]
}

export interface BubbleReactComponentExecutionContext {
  getComponentState(path: string): BubbleReactComponentState
  getReactClientInternals(): BubbleReactClientInternals
  markComponentAsUsed(path: string): void
  scheduleRender(): void
}

function createUnsupportedHook(): () => never {
  return () => {
    throw new Error(UNSUPPORTED_REACT_HOOK_ERROR)
  }
}

export function executeFunctionComponent(
  componentPath: string,
  component: (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>,
  props: Record<string, unknown>,
  context: BubbleReactComponentExecutionContext
): ReactNode {
  const componentState = context.getComponentState(componentPath)
  let hookIndex = 0

  const dispatcher: BubbleReactHookDispatcher & Record<string, unknown> = {
    useState<TValue>(
      initialState: TValue | (() => TValue)
    ): [TValue, Dispatch<SetStateAction<TValue>>] {
      const existingState = componentState.hooks[hookIndex] as
        | BubbleReactHookState<TValue>
        | undefined

      if (existingState !== undefined) {
        hookIndex += 1
        return [existingState.value, existingState.setValue]
      }

      const stateIndex = hookIndex
      const initialValue =
        typeof initialState === 'function'
          ? (initialState as () => TValue)()
          : initialState
      const hookState: BubbleReactHookState<TValue> = {
        value: initialValue,
        setValue(nextValue) {
          const resolvedValue =
            typeof nextValue === 'function'
              ? (nextValue as (value: TValue) => TValue)(hookState.value)
              : nextValue

          if (Object.is(hookState.value, resolvedValue)) {
            return
          }

          hookState.value = resolvedValue
          context.scheduleRender()
        },
      }

      componentState.hooks[stateIndex] = hookState
      hookIndex += 1
      return [hookState.value, hookState.setValue]
    },
    useCallback: createUnsupportedHook(),
    useContext: createUnsupportedHook(),
    useDebugValue: createUnsupportedHook(),
    useDeferredValue: createUnsupportedHook(),
    useEffect: createUnsupportedHook(),
    useId: createUnsupportedHook(),
    useImperativeHandle: createUnsupportedHook(),
    useInsertionEffect: createUnsupportedHook(),
    useLayoutEffect: createUnsupportedHook(),
    useMemo: createUnsupportedHook(),
    useOptimistic: createUnsupportedHook(),
    useReducer: createUnsupportedHook(),
    useRef: createUnsupportedHook(),
    useSyncExternalStore: createUnsupportedHook(),
    useTransition: createUnsupportedHook(),
  }
  const reactClientInternals = context.getReactClientInternals()
  const previousDispatcher = reactClientInternals.H

  reactClientInternals.H = dispatcher

  try {
    context.markComponentAsUsed(componentPath)
    const renderedNode = component(props)

    if (renderedNode instanceof Promise) {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR)
    }

    return renderedNode
  } finally {
    reactClientInternals.H = previousDispatcher
  }
}
