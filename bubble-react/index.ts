import {
  Children,
  isValidElement,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import type { BubbleRuntime } from '../bubble-core'

import {
  EVENT_TYPE_BY_HANDLER_NAME,
  PROPERTY_DEFAULTS,
  reconcileChildren,
  type BubbleReactEventHandler,
  type BubbleReactEventHandlerName,
  type BubbleReactNode,
  type BubbleReactPlan,
  type BubbleReactPropertyName,
} from './child-reconciliation'
import {
  readReactClientInternals,
  type BubbleReactClientInternals,
  type BubbleReactHookDispatcher,
} from './react-client-internals'

export interface BubbleReactRoot {
  render(node: ReactNode): void
  unmount(): void
}

export interface CreateBubbleReactRootOptions {
  bubble: BubbleRuntime
}

const UNSUPPORTED_REACT_NODE_TYPE_ERROR =
  'bubble-react only supports host elements and text nodes in this slice'
const UNSUPPORTED_REACT_HOOK_ERROR =
  'bubble-react only supports useState in this slice'

interface BubbleReactHookState<TValue> {
  value: TValue
  setValue: Dispatch<SetStateAction<TValue>>
}

interface BubbleReactComponentState {
  hooks: unknown[]
}

interface BubbleReactPlanningContext {
  getComponentState(path: string): BubbleReactComponentState
  getReactClientInternals(): BubbleReactClientInternals
  markComponentAsUsed(path: string): void
  scheduleRender(): void
}

function normalizeAttributeName(name: string): string {
  if (name === 'className') {
    return 'class'
  }

  if (name === 'htmlFor') {
    return 'for'
  }

  return name
}

function isBubbleReactPropertyName(
  name: string
): name is BubbleReactPropertyName {
  return name in PROPERTY_DEFAULTS
}

function isBubbleReactEventHandlerName(
  name: string
): name is BubbleReactEventHandlerName {
  return name in EVENT_TYPE_BY_HANDLER_NAME
}

function planReactProps(props: Record<string, unknown>): {
  attributes: Record<string, string>
  properties: Partial<Record<BubbleReactPropertyName, unknown>>
  eventHandlers: Partial<
    Record<BubbleReactEventHandlerName, BubbleReactEventHandler>
  >
} {
  const attributes: Record<string, string> = {}
  const properties: Partial<Record<BubbleReactPropertyName, unknown>> = {}
  const eventHandlers: Partial<
    Record<BubbleReactEventHandlerName, BubbleReactEventHandler>
  > = {}

  for (const [name, value] of Object.entries(props)) {
    if (
      name === 'children' ||
      value === undefined ||
      value === null ||
      value === false
    ) {
      continue
    }

    if (typeof value === 'function' && isBubbleReactEventHandlerName(name)) {
      eventHandlers[name] = value as BubbleReactEventHandler
    } else if (isBubbleReactPropertyName(name)) {
      properties[name] = name === 'value' ? String(value) : value
    } else {
      attributes[normalizeAttributeName(name)] =
        value === true ? '' : String(value)
    }
  }

  return { attributes, properties, eventHandlers }
}

function createUnsupportedHook(): () => never {
  return () => {
    throw new Error(UNSUPPORTED_REACT_HOOK_ERROR)
  }
}

function planFunctionComponent(
  componentPath: string,
  component: (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>,
  props: Record<string, unknown>,
  context: BubbleReactPlanningContext
): readonly BubbleReactPlan[] {
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

    return planReactNode(renderedNode, context, componentPath)
  } finally {
    reactClientInternals.H = previousDispatcher
  }
}

function planReactNode(
  node: ReactNode,
  context: BubbleReactPlanningContext,
  parentPath = 'root'
): readonly BubbleReactPlan[] {
  const plans: BubbleReactPlan[] = []
  let index = 0

  Children.forEach(node, child => {
    const childPath = `${parentPath}.${index}`
    index += 1

    if (typeof child === 'string' || typeof child === 'number') {
      plans.push({
        kind: 'text',
        key: null,
        value: String(child),
      })
      return
    }

    if (!isValidElement(child)) {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR)
    }

    const props = child.props as Record<string, unknown>
    const key = child.key === null ? null : String(child.key)

    if (typeof child.type === 'function') {
      plans.push(
        ...planFunctionComponent(
          childPath,
          child.type as (
            props: Record<string, unknown>
          ) => ReactNode | Promise<ReactNode>,
          props,
          context
        )
      )
      return
    }

    if (typeof child.type !== 'string') {
      throw new Error(UNSUPPORTED_REACT_NODE_TYPE_ERROR)
    }

    const { attributes, properties, eventHandlers } = planReactProps(props)

    plans.push({
      kind: 'element',
      key,
      tag: child.type,
      attributes,
      properties,
      eventHandlers,
      children: [
        ...planReactNode(props.children as ReactNode, context, childPath),
      ],
    })
  })

  return plans
}

export function createBubbleReactRoot(
  options: CreateBubbleReactRootOptions
): BubbleReactRoot {
  let currentChildren: BubbleReactNode[] = []
  let currentNode: ReactNode = null
  const componentStateByPath = new Map<string, BubbleReactComponentState>()
  let isRendering = false
  let rerenderRequested = false

  const getComponentState = (path: string): BubbleReactComponentState => {
    const existingState = componentStateByPath.get(path)

    if (existingState !== undefined) {
      return existingState
    }

    const nextState: BubbleReactComponentState = {
      hooks: [],
    }

    componentStateByPath.set(path, nextState)
    return nextState
  }

  const scheduleRender = (): void => {
    rerenderRequested = true

    if (!isRendering) {
      renderCurrentNode()
    }
  }

  const renderCurrentNode = (): void => {
    if (isRendering) {
      rerenderRequested = true
      return
    }

    isRendering = true

    try {
      do {
        rerenderRequested = false
        const usedComponentPaths = new Set<string>()
        const nextPlans = planReactNode(currentNode, {
          getComponentState,
          getReactClientInternals: readReactClientInternals,
          markComponentAsUsed(path) {
            usedComponentPaths.add(path)
          },
          scheduleRender,
        })
        let nextChildren: BubbleReactNode[] = []

        options.bubble.transact(tx => {
          nextChildren = reconcileChildren({
            parentId: options.bubble.rootId,
            currentChildren,
            nextPlans,
            tx,
          })
        })

        currentChildren = nextChildren

        for (const path of componentStateByPath.keys()) {
          if (!usedComponentPaths.has(path)) {
            componentStateByPath.delete(path)
          }
        }
      } while (rerenderRequested)
    } finally {
      isRendering = false
    }
  }

  const render = (node: ReactNode): void => {
    currentNode = node
    renderCurrentNode()
  }

  return { render, unmount: () => render(null) }
}
