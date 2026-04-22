import type { ReactNode } from 'react'

import type { BubbleRuntime, CreateBubbleOptions } from '../bubble-core'
import type { BubbleReactComponentState } from './component-execution'

import { createBubble } from '../bubble-core'
import { reconcileChildren, type BubbleReactNode } from './child-reconciliation'
import { planReactNode, type BubbleReactPlanningContext } from './planner'
import { readReactClientInternals } from './react-client-internals'

export {
  valueChangeHandler,
  textInput,
  formSubmitHandler,
  type TextInputProps,
} from './react-dom-bindings'

export interface BubbleReactRoot {
  render(node: ReactNode): void
  unmount(): void
}

export interface CreateBubbleReactRootOptions {
  bubble: BubbleRuntime
}

export interface BubbleReactApp {
  readonly bubble: BubbleRuntime
  readonly root: BubbleReactRoot
  render(node: ReactNode): void
  unmount(): void
}

export interface CreateBubbleReactAppOptions {
  readonly bubble?: BubbleRuntime
  readonly capabilities?: CreateBubbleOptions['capabilities']
  readonly node?: ReactNode
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
        const planningContext: BubbleReactPlanningContext = {
          getComponentState,
          getReactClientInternals: readReactClientInternals,
          markComponentAsUsed(path) {
            usedComponentPaths.add(path)
          },
          scheduleRender,
        }
        const nextPlans = planReactNode(currentNode, planningContext)
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

export function createBubbleReactApp(
  options: CreateBubbleReactAppOptions = {}
): BubbleReactApp {
  const bubble =
    options.bubble ?? createBubble({ capabilities: options.capabilities })
  const root = createBubbleReactRoot({ bubble })

  if (options.node !== undefined) {
    root.render(options.node)
  }

  return {
    bubble,
    root,
    render(node: ReactNode): void {
      root.render(node)
    },
    unmount(): void {
      root.unmount()
    },
  }
}
