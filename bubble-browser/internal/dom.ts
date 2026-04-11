import type { BubbleRect } from '../../bubble-capabilities'

export interface DomParentNode {
  appendChild(node: DomChildNode): DomChildNode
  insertBefore(
    node: DomChildNode,
    referenceNode: DomChildNode | null
  ): DomChildNode
  removeChild(node: DomChildNode): DomChildNode
}

export interface DomChildNode {
  parentNode: DomParentNode | null
  remove(): void
}

export interface DomTextNode extends DomChildNode {
  data: string
}

export interface DomElementNode extends DomChildNode, DomParentNode {
  addEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  removeEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  focus(): void
  blur(): void
  getBoundingClientRect(): BubbleRect
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

export interface DomValueElementNode extends DomElementNode {
  value: unknown
}

export interface DomCheckedElementNode extends DomElementNode {
  checked: unknown
}

export interface DomEvent {
  readonly type: string
  readonly target: DomChildNode | null
  preventDefault(): void
}

export interface DomDocument {
  activeElement: DomElementNode | null
  createElement(tag: string): DomElementNode
  createTextNode(value: string): DomTextNode
}

export interface DomContainer extends DomParentNode {
  addEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  removeEventListener(
    type: string,
    listener: (event: DomEvent) => void,
    options?: boolean
  ): void
  ownerDocument: DomDocument
}

export function isDomElementNode(node: DomChildNode): node is DomElementNode {
  return 'focus' in node
}
