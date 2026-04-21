import { Children, Fragment, isValidElement, type ReactNode } from 'react'

import type { BubbleReactComponentExecutionContext } from './component-execution'

import { executeFunctionComponent } from './component-execution'
import { UNSUPPORTED_REACT_NODE_TYPE_ERROR } from './planner-errors'
import {
  EVENT_TYPE_BY_HANDLER_NAME,
  PROPERTY_DEFAULTS,
  type BubbleReactEventHandler,
  type BubbleReactEventHandlerName,
  type BubbleReactPropertyName,
} from './react-dom-bindings'

export interface BubbleReactTextPlan {
  kind: 'text'
  key: string | null
  value: string
}

export interface BubbleReactElementPlan {
  kind: 'element'
  key: string | null
  tag: string
  attributes: Record<string, string>
  properties: Partial<Record<BubbleReactPropertyName, unknown>>
  eventHandlers: Partial<
    Record<BubbleReactEventHandlerName, BubbleReactEventHandler>
  >
  children: BubbleReactPlan[]
}

export type BubbleReactPlan = BubbleReactTextPlan | BubbleReactElementPlan

export interface BubbleReactPlanningContext extends BubbleReactComponentExecutionContext {}

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

export function planReactProps(props: Record<string, unknown>): {
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
      continue
    }

    if (isBubbleReactPropertyName(name)) {
      properties[name] = name === 'value' ? String(value) : value
      continue
    }

    attributes[normalizeAttributeName(name)] =
      value === true ? '' : String(value)
  }

  return { attributes, properties, eventHandlers }
}

export function planReactNode(
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

    if (child.type === Fragment) {
      plans.push(
        ...planReactNode(props.children as ReactNode, context, childPath)
      )
      return
    }

    if (typeof child.type === 'function') {
      plans.push(
        ...planReactNode(
          executeFunctionComponent(
            childPath,
            child.type as (
              props: Record<string, unknown>
            ) => ReactNode | Promise<ReactNode>,
            props,
            context
          ),
          context,
          childPath
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
