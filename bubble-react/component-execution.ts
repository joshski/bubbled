import type { Dispatch, ReactNode, Reducer, SetStateAction } from 'react'

import type { BubbleRuntime } from '../bubble-core'
import type {
  BubbleReactClientInternals,
  BubbleReactHookDispatcher,
} from './react-client-internals'

import {
  UNSUPPORTED_REACT_HOOK_ERROR,
  UNSUPPORTED_REACT_NODE_TYPE_ERROR,
} from './planner-errors'
import { withCurrentBubbleRuntime } from './runtime-hooks'

interface BubbleReactHookState<TValue> {
  value: TValue
  setValue: Dispatch<SetStateAction<TValue>>
}

interface BubbleReactReducerState<TState, TAction> {
  state: TState
  dispatch: Dispatch<TAction>
}

interface BubbleReactRefState<TValue> {
  ref: { current: TValue }
}

export interface BubbleReactComponentState {
  hooks: unknown[]
}

export interface BubbleReactComponentExecutionContext {
  bubble: BubbleRuntime
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
    useReducer<TState, TAction>(
      reducer: Reducer<TState, TAction>,
      initialArg: TState,
      init?: (initialArg: TState) => TState
    ): [TState, Dispatch<TAction>] {
      const existingState = componentState.hooks[hookIndex] as
        | BubbleReactReducerState<TState, TAction>
        | undefined

      if (existingState !== undefined) {
        hookIndex += 1
        return [existingState.state, existingState.dispatch]
      }

      const stateIndex = hookIndex
      const initialState = init ? init(initialArg) : initialArg
      const reducerState: BubbleReactReducerState<TState, TAction> = {
        state: initialState,
        dispatch(action) {
          const nextState = reducer(reducerState.state, action)
          if (Object.is(reducerState.state, nextState)) {
            return
          }
          reducerState.state = nextState
          context.scheduleRender()
        },
      }
      componentState.hooks[stateIndex] = reducerState
      hookIndex += 1
      return [reducerState.state, reducerState.dispatch]
    },
    useRef<TValue>(initialValue: TValue): { current: TValue } {
      const existingState = componentState.hooks[hookIndex] as
        | BubbleReactRefState<TValue>
        | undefined

      if (existingState !== undefined) {
        hookIndex += 1
        return existingState.ref
      }

      const stateIndex = hookIndex
      const ref = { current: initialValue }
      componentState.hooks[stateIndex] = { ref }
      hookIndex += 1
      return ref
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
    useSyncExternalStore: createUnsupportedHook(),
    useTransition: createUnsupportedHook(),
  }
  const reactClientInternals = context.getReactClientInternals()
  const previousDispatcher = reactClientInternals.H

  reactClientInternals.H = dispatcher

  try {
    context.markComponentAsUsed(componentPath)
    const renderedNode = withCurrentBubbleRuntime(context.bubble, () =>
      component(props)
    )

    if (renderedNode instanceof Promise) {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR)
    }

    return renderedNode
  } finally {
    reactClientInternals.H = previousDispatcher
  }
}
