import { createElement } from 'react'
import { describe, expect, test } from 'vitest'

import {
  type BubbleElementNode,
  createBubble,
  type BubbleRootNode,
  type BubbleRuntime,
  type BubbleRuntimeListener,
  type BubbleTextNode,
} from '../bubble-core'
import {
  createBrowserNetwork,
  createDomLayout,
  createDomProjector,
  measureAndPlacePopover,
  mountBubbleApp,
  placePopover,
  startBubbleReactApp,
} from './index'

abstract class FakeDomNode {
  parentNode: FakeDomElement | null = null

  remove() {
    this.parentNode?.removeChild(this)
  }

  abstract toMarkup(): string
}

interface FakeDomEvent {
  readonly type: string
  readonly target: FakeDomNode | null
  preventDefault(): void
}

class FakeDomText extends FakeDomNode {
  constructor(data: string) {
    super()
    this.data = data
  }

  data: string

  toMarkup(): string {
    return this.data
  }
}

class FakeDomElement extends FakeDomNode {
  readonly childNodes: FakeDomNode[] = []
  readonly attributes = new Map<string, string>()
  readonly listeners = new Map<string, Array<(event: FakeDomEvent) => void>>()
  defaultPrevented = false
  value = ''
  rect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }

  constructor(
    readonly ownerDocument: FakeDomDocument,
    readonly tagName: string
  ) {
    super()
  }

  appendChild(node: FakeDomNode): FakeDomNode {
    return this.insertBefore(node, null)
  }

  insertBefore(
    node: FakeDomNode,
    referenceNode: FakeDomNode | null
  ): FakeDomNode {
    node.parentNode?.removeChild(node)
    node.parentNode = this

    if (referenceNode === null) {
      this.childNodes.push(node)
      return node
    }

    const referenceIndex = this.childNodes.indexOf(referenceNode)

    if (referenceIndex === -1) {
      this.childNodes.push(node)
      return node
    }

    this.childNodes.splice(referenceIndex, 0, node)

    return node
  }

  removeChild(node: FakeDomNode): FakeDomNode {
    const childIndex = this.childNodes.indexOf(node)

    if (childIndex >= 0) {
      this.childNodes.splice(childIndex, 1)
      node.parentNode = null
    }

    return node
  }

  replaceChildren(...nodes: FakeDomNode[]) {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0] as FakeDomNode)
    }
    for (const node of nodes) {
      this.appendChild(node)
    }
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  focus() {
    if (this.ownerDocument.activeElement === this) {
      return
    }

    this.ownerDocument.activeElement?.blur()
    this.ownerDocument.activeElement = this
    this.dispatchEvent({
      type: 'focus',
      target: this,
      preventDefault() {},
    })
  }

  blur() {
    if (this.ownerDocument.activeElement !== this) {
      return
    }

    this.ownerDocument.activeElement = null
    this.dispatchEvent({
      type: 'blur',
      target: this,
      preventDefault() {},
    })
  }

  addEventListener(
    type: string,
    listener: (event: FakeDomEvent) => void,
    _options?: boolean
  ) {
    const listeners = this.listeners.get(type) ?? []

    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(
    type: string,
    listener: (event: FakeDomEvent) => void,
    _options?: boolean
  ) {
    const listeners = this.listeners.get(type)

    if (listeners === undefined) {
      return
    }

    const nextListeners = listeners.filter(
      registeredListener => registeredListener !== listener
    )

    if (nextListeners.length === 0) {
      this.listeners.delete(type)
      return
    }

    this.listeners.set(type, nextListeners)
  }

  dispatchEvent(event: FakeDomEvent) {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event)
    }

    this.parentNode?.dispatchEvent(event)
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  getBoundingClientRect() {
    return { ...this.rect }
  }

  toMarkup(): string {
    const serializedAttributes = Array.from(this.attributes.entries())
      .map(([name, value]) => ` ${name}="${value}"`)
      .join('')
    const serializedChildren = this.childNodes
      .map(child => child.toMarkup())
      .join('')

    return `<${this.tagName}${serializedAttributes}>${serializedChildren}</${this.tagName}>`
  }
}

class FakeDomDocument {
  activeElement: FakeDomElement | null = null

  createElement(tag: string): FakeDomElement {
    return new FakeDomElement(this, tag)
  }

  createTextNode(value: string): FakeDomText {
    return new FakeDomText(value)
  }
}

function createContainer() {
  const document = new FakeDomDocument()
  const container = document.createElement('div')

  return {
    container,
    markup() {
      return container.childNodes.map(child => child.toMarkup()).join('')
    },
  }
}

function createProjectorTestBubble(
  overrides: Partial<BubbleRuntime>
): BubbleRuntime {
  return {
    rootId: 'root',
    resolveCapability() {
      throw new Error('not implemented')
    },
    now() {
      return 0
    },
    setTimeout() {
      throw new Error('not implemented')
    },
    clearTimeout() {},
    queueMicrotask() {},
    measureElement() {
      throw new Error('not implemented')
    },
    getViewportState() {
      return { width: 0, height: 0, scrollX: 0, scrollY: 0 }
    },
    subscribeToViewport() {
      return () => {}
    },
    fetch() {
      throw new Error('not implemented')
    },
    transact(fn) {
      throw new Error(`not implemented: ${String(fn)}`)
    },
    getNode() {
      return null
    },
    getRoot() {
      return { id: 'root', kind: 'root', children: [] }
    },
    snapshot() {
      return {
        rootId: 'root',
        nodes: new Map([['root', { id: 'root', kind: 'root', children: [] }]]),
        query: {
          getById() {
            return null
          },
          getByTag() {
            return []
          },
          getByRole() {
            return []
          },
          getControlForLabel() {
            return null
          },
        },
      }
    },
    serializeForm() {
      return []
    },
    dispatchEvent() {
      return { defaultPrevented: false, delivered: false }
    },
    focus() {},
    blur() {},
    getFocusedNodeId() {
      return null
    },
    getTabOrder() {
      return []
    },
    subscribe() {
      return () => {}
    },
    ...overrides,
  } as BubbleRuntime
}

describe('createDomProjector', () => {
  test('placePopover returns a bottom placement when the overlay fits below the anchor', () => {
    expect(
      placePopover({
        anchor: { x: 24, y: 40, width: 80, height: 20 },
        overlay: { x: 0, y: 0, width: 120, height: 60 },
        viewport: { width: 320, height: 200, scrollX: 0, scrollY: 0 },
      })
    ).toEqual({
      x: 24,
      y: 60,
      placement: 'bottom',
    })
  })

  test('placePopover returns a top placement when the overlay would overflow below the viewport', () => {
    expect(
      placePopover({
        anchor: { x: 24, y: 140, width: 80, height: 20 },
        overlay: { x: 0, y: 0, width: 120, height: 60 },
        viewport: { width: 320, height: 180, scrollX: 0, scrollY: 0 },
      })
    ).toEqual({
      x: 24,
      y: 80,
      placement: 'top',
    })
  })

  test('measureAndPlacePopover reads bubble layout and viewport capabilities', () => {
    const calls: string[] = []
    const placement = measureAndPlacePopover(
      {
        measureElement(nodeId) {
          calls.push(nodeId)

          if (nodeId === 'anchor') {
            return { x: 12, y: 16, width: 40, height: 24 }
          }

          return { x: 0, y: 0, width: 80, height: 30 }
        },
        getViewportState() {
          calls.push('viewport')
          return { width: 200, height: 120, scrollX: 0, scrollY: 0 }
        },
      },
      'anchor',
      'overlay'
    )

    expect(placement).toEqual({
      x: 12,
      y: 40,
      placement: 'bottom',
    })
    expect(calls).toEqual(['anchor', 'overlay', 'viewport'])
  })

  test('createDomLayout measures projected elements', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)
    ;(container.childNodes[0] as FakeDomElement).rect = {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    }

    expect(createDomLayout({ projector }).measureElement(buttonId)).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    })
  })

  test('createDomLayout rejects projectors without measurement support', () => {
    const layout = createDomLayout({
      projector: {
        mount() {},
        unmount() {},
      } as unknown as ReturnType<typeof createDomProjector>,
    })

    expect(() => {
      layout.measureElement('missing')
    }).toThrow(
      'Bubble DOM projector does not support DOM-backed layout measurement.'
    )
  })

  test('createDomLayout rejects unprojected bubble nodes', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
    })

    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      createDomLayout({ projector }).measureElement(buttonId)
    }).toThrow(
      `Bubble DOM projector has no projected element for node ${buttonId}.`
    )
  })

  test('createDomLayout rejects detached projected nodes', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble })
    const { container } = createContainer()
    const layout = createDomLayout({ projector })

    projector.mount(container as unknown as HTMLElement)

    bubble.transact(tx => {
      tx.removeChild({ parentId: bubble.rootId, childId: buttonId })
    })

    expect(() => {
      layout.measureElement(buttonId)
    }).toThrow(`Bubble DOM projector cannot measure detached node ${buttonId}.`)
  })

  test('initial mount creates the expected DOM', () => {
    const bubble = createBubble()

    bubble.transact(tx => {
      const sectionId = tx.createElement({ tag: 'section' })
      const buttonId = tx.createElement({ tag: 'button' })
      const textId = tx.createText({ value: 'Save' })

      tx.insertChild({ parentId: bubble.rootId, childId: sectionId })
      tx.insertChild({ parentId: sectionId, childId: buttonId })
      tx.insertChild({ parentId: buttonId, childId: textId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(markup()).toBe('<section><button>Save</button></section>')
    expect(container.childNodes).toHaveLength(1)
  })

  test('projects text and attributes into the mounted container', () => {
    const bubble = createBubble()

    bubble.transact(tx => {
      const buttonId = tx.createElement({ tag: 'button' })
      const textId = tx.createText({ value: 'Publish' })

      tx.setAttribute({ nodeId: buttonId, name: 'type', value: 'button' })
      tx.setAttribute({
        nodeId: buttonId,
        name: 'aria-label',
        value: 'Publish entry',
      })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.insertChild({ parentId: buttonId, childId: textId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const button = container.childNodes[0]

    expect(markup()).toBe(
      '<button type="button" aria-label="Publish entry">Publish</button>'
    )
    expect(button).toBeInstanceOf(FakeDomElement)
    expect((button as FakeDomElement).getAttribute('type')).toBe('button')
    expect((button as FakeDomElement).getAttribute('aria-label')).toBe(
      'Publish entry'
    )
  })

  test('cleanup removes only the projected nodes', () => {
    const bubble = createBubble()

    bubble.transact(tx => {
      const textId = tx.createText({ value: 'Mounted' })
      tx.insertChild({ parentId: bubble.rootId, childId: textId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()
    const existingNode = container.ownerDocument.createElement('p')

    existingNode.appendChild(container.ownerDocument.createTextNode('Existing'))
    container.appendChild(existingNode)

    projector.unmount()
    projector.mount(container as unknown as HTMLElement)

    expect(markup()).toBe('<p>Existing</p>Mounted')

    projector.unmount()

    expect(markup()).toBe('<p>Existing</p>')
    expect(container.childNodes).toHaveLength(1)
  })

  test('rejects mounting the same projector twice without cleanup', () => {
    const bubble = createBubble()
    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => projector.mount(container as unknown as HTMLElement)).toThrow(
      'Bubble DOM projector is already mounted.'
    )
  })

  test('applies insert, remove, move, and text updates incrementally', () => {
    const bubble = createBubble()
    let listId = ''
    let alphaId = ''
    let betaId = ''
    let gammaId = ''
    let alphaTextId = ''
    let betaTextId = ''
    let gammaTextId = ''

    bubble.transact(tx => {
      listId = tx.createElement({ tag: 'ul' })
      alphaId = tx.createElement({ tag: 'li' })
      betaId = tx.createElement({ tag: 'li' })
      gammaId = tx.createElement({ tag: 'li' })
      alphaTextId = tx.createText({ value: 'Alpha' })
      betaTextId = tx.createText({ value: 'Beta' })
      gammaTextId = tx.createText({ value: 'Gamma' })

      tx.insertChild({ parentId: bubble.rootId, childId: listId })
      tx.insertChild({ parentId: listId, childId: alphaId })
      tx.insertChild({ parentId: alphaId, childId: alphaTextId })
      tx.insertChild({ parentId: listId, childId: betaId })
      tx.insertChild({ parentId: betaId, childId: betaTextId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    bubble.transact(tx => {
      tx.insertChild({ parentId: listId, childId: gammaId, index: 1 })
      tx.insertChild({ parentId: gammaId, childId: gammaTextId })
      tx.moveChild({ parentId: listId, childId: betaId, index: 0 })
      tx.setText({ nodeId: gammaTextId, value: 'Delta' })
      tx.removeChild({ parentId: listId, childId: alphaId })
    })

    expect(markup()).toBe('<ul><li>Beta</li><li>Delta</li></ul>')
  })

  test('preserves projected node identity across in-place updates', () => {
    const bubble = createBubble()
    let listId = ''
    let firstItemId = ''
    let secondItemId = ''
    let firstTextId = ''

    bubble.transact(tx => {
      listId = tx.createElement({ tag: 'ul' })
      firstItemId = tx.createElement({ tag: 'li' })
      secondItemId = tx.createElement({ tag: 'li' })
      firstTextId = tx.createText({ value: 'First' })
      const secondTextId = tx.createText({ value: 'Second' })

      tx.insertChild({ parentId: bubble.rootId, childId: listId })
      tx.insertChild({ parentId: listId, childId: firstItemId })
      tx.insertChild({ parentId: firstItemId, childId: firstTextId })
      tx.insertChild({ parentId: listId, childId: secondItemId })
      tx.insertChild({ parentId: secondItemId, childId: secondTextId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const list = container.childNodes[0] as FakeDomElement
    const firstItemNode = list.childNodes[0]
    const firstTextNode = (firstItemNode as FakeDomElement).childNodes[0]

    bubble.transact(tx => {
      tx.moveChild({ parentId: listId, childId: firstItemId, index: 1 })
      tx.setText({ nodeId: firstTextId, value: 'Updated' })
    })

    expect(markup()).toBe('<ul><li>Second</li><li>Updated</li></ul>')
    expect(list.childNodes[1]).toBe(firstItemNode)
    expect((list.childNodes[1] as FakeDomElement).childNodes[0]).toBe(
      firstTextNode
    )
  })

  test('applies mounted attribute and property updates', () => {
    const bubble = createBubble()
    let inputId = ''

    bubble.transact(tx => {
      inputId = tx.createElement({ tag: 'input' })
      tx.insertChild({ parentId: bubble.rootId, childId: inputId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    bubble.transact(tx => {
      tx.setAttribute({ nodeId: inputId, name: 'type', value: 'text' })
      tx.setProperty({
        nodeId: inputId,
        name: 'value',
        value: 'Projected into the DOM',
      })
    })

    const input = container.childNodes[0] as FakeDomElement

    expect(markup()).toBe('<input type="text"></input>')
    expect(input.value).toBe('Projected into the DOM')
  })

  test('applies mounted attribute removals', () => {
    const bubble = createBubble()
    let inputId = ''

    bubble.transact(tx => {
      inputId = tx.createElement({ tag: 'input' })
      tx.setAttribute({ nodeId: inputId, name: 'type', value: 'text' })
      tx.insertChild({ parentId: bubble.rootId, childId: inputId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    bubble.transact(tx => {
      tx.removeAttribute({ nodeId: inputId, name: 'type' })
    })

    expect(container.childNodes[0]).toBeDefined()
    expect(markup()).toBe('<input></input>')
  })

  test('ignores node-created mutations until a created node is inserted', () => {
    const bubble = createBubble()
    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    bubble.transact(tx => {
      tx.createElement({ tag: 'aside' })
    })

    expect(container.childNodes).toHaveLength(0)
    expect(markup()).toBe('')
  })

  test('inserts root children incrementally before existing projected siblings', () => {
    const bubble = createBubble()
    let existingId = ''
    let existingTextId = ''
    let insertedId = ''
    let insertedTextId = ''

    bubble.transact(tx => {
      existingId = tx.createElement({ tag: 'main' })
      existingTextId = tx.createText({ value: 'Existing' })
      insertedId = tx.createElement({ tag: 'aside' })
      insertedTextId = tx.createText({ value: 'Inserted' })

      tx.insertChild({ parentId: bubble.rootId, childId: existingId })
      tx.insertChild({ parentId: existingId, childId: existingTextId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    bubble.transact(tx => {
      tx.insertChild({ parentId: bubble.rootId, childId: insertedId, index: 0 })
      tx.insertChild({ parentId: insertedId, childId: insertedTextId })
    })

    expect(markup()).toBe('<aside>Inserted</aside><main>Existing</main>')
  })

  test('click in DOM reaches bubble listener', () => {
    const bubble = createBubble()
    const calls: string[] = []
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      const textId = tx.createText({ value: 'Save' })

      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.insertChild({ parentId: buttonId, childId: textId })
      tx.addEventListener({
        nodeId: buttonId,
        type: 'click',
        listener: () => {
          calls.push('clicked')
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    ;(container.childNodes[0] as FakeDomElement).dispatchEvent({
      type: 'click',
      target: container.childNodes[0] ?? null,
      preventDefault() {},
    })

    expect(buttonId).not.toBe('')
    expect(calls).toEqual(['clicked'])
  })

  test('bridged DOM clicks preserve the mapped bubble target', () => {
    const bubble = createBubble()
    const calls: string[] = []
    let sectionId = ''
    let buttonId = ''

    bubble.transact(tx => {
      sectionId = tx.createElement({ tag: 'section' })
      buttonId = tx.createElement({ tag: 'button' })
      const textId = tx.createText({ value: 'Save' })

      tx.insertChild({ parentId: bubble.rootId, childId: sectionId })
      tx.insertChild({ parentId: sectionId, childId: buttonId })
      tx.insertChild({ parentId: buttonId, childId: textId })
      tx.addEventListener({
        nodeId: sectionId,
        type: 'click',
        listener: event => {
          calls.push(
            `${event.targetId}:${event.currentTargetId}:${event.phase}`
          )
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const section = container.childNodes[0] as FakeDomElement
    const button = section.childNodes[0] as FakeDomElement

    button.dispatchEvent({
      type: 'click',
      target: button,
      preventDefault() {},
    })

    expect(buttonId).not.toBe(sectionId)
    expect(calls).toEqual([`${buttonId}:${sectionId}:bubble`])
  })

  test('unknown DOM targets fail safely', () => {
    const bubble = createBubble()
    const calls: string[] = []

    bubble.transact(tx => {
      const buttonId = tx.createElement({ tag: 'button' })

      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.addEventListener({
        nodeId: buttonId,
        type: 'click',
        listener: () => {
          calls.push('clicked')
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()
    const unknownTarget = container.ownerDocument.createElement('span')

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      container.dispatchEvent({
        type: 'click',
        target: unknownTarget,
        preventDefault() {},
      })
    }).not.toThrow()
    expect(calls).toEqual([])
  })

  test('null DOM targets fail safely', () => {
    const bubble = createBubble()
    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      container.dispatchEvent({
        type: 'click',
        target: null,
        preventDefault() {},
      })
    }).not.toThrow()
  })

  test('unmount removes bridged DOM event listeners', () => {
    const bubble = createBubble()
    const calls: string[] = []

    bubble.transact(tx => {
      const buttonId = tx.createElement({ tag: 'button' })

      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.addEventListener({
        nodeId: buttonId,
        type: 'click',
        listener: () => {
          calls.push('clicked')
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()
    const button = container.ownerDocument.createElement('button')

    projector.mount(container as unknown as HTMLElement)
    const projectedButton = container.childNodes[0] as FakeDomElement

    projectedButton.dispatchEvent({
      type: 'click',
      target: projectedButton,
      preventDefault() {},
    })

    projector.unmount()

    container.appendChild(button)
    button.dispatchEvent({
      type: 'click',
      target: button,
      preventDefault() {},
    })

    expect(calls).toEqual(['clicked'])
  })

  test('bridged DOM submits dispatch bubble submit events and prevent native submission', () => {
    const bubble = createBubble()
    const calls: Array<{ currentTargetId: string; defaultPrevented: boolean }> =
      []
    let formId = ''

    bubble.transact(tx => {
      formId = tx.createElement({ tag: 'form' })
      const inputId = tx.createElement({ tag: 'input' })

      tx.setAttribute({ nodeId: inputId, name: 'name', value: 'email' })
      tx.setProperty({
        nodeId: inputId,
        name: 'value',
        value: 'person@example.com',
      })
      tx.insertChild({ parentId: bubble.rootId, childId: formId })
      tx.insertChild({ parentId: formId, childId: inputId })
      tx.addEventListener({
        nodeId: formId,
        type: 'submit',
        listener: event => {
          calls.push({
            currentTargetId: event.currentTargetId,
            defaultPrevented: event.defaultPrevented,
          })
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const form = container.childNodes[0] as FakeDomElement

    form.dispatchEvent({
      type: 'submit',
      target: form,
      preventDefault() {
        form.defaultPrevented = true
      },
    })

    expect(formId).not.toBe('')
    expect(calls).toEqual([
      {
        currentTargetId: formId,
        defaultPrevented: false,
      },
    ])
    expect(form.defaultPrevented).toBe(true)
  })

  test('bridged DOM input events dispatch bubble change events with the current value', () => {
    const bubble = createBubble()
    const calls: Array<{ currentTargetId: string; value: unknown }> = []
    let inputId = ''

    bubble.transact(tx => {
      inputId = tx.createElement({ tag: 'input' })
      tx.setAttribute({ nodeId: inputId, name: 'type', value: 'text' })
      tx.setProperty({ nodeId: inputId, name: 'value', value: 'Draft' })
      tx.insertChild({ parentId: bubble.rootId, childId: inputId })
      tx.addEventListener({
        nodeId: inputId,
        type: 'change',
        listener: event => {
          calls.push({
            currentTargetId: event.currentTargetId,
            value: event.data['value'],
          })
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const input = container.childNodes[0] as FakeDomElement
    input.value = 'Published'
    input.dispatchEvent({
      type: 'input',
      target: input,
      preventDefault() {},
    })

    expect(calls).toEqual([
      {
        currentTargetId: inputId,
        value: 'Published',
      },
    ])
  })

  test('bridged DOM input events include checkbox checked state', () => {
    const bubble = createBubble()
    const calls: Array<{ checked: unknown }> = []
    let inputId = ''

    bubble.transact(tx => {
      inputId = tx.createElement({ tag: 'input' })
      tx.setAttribute({ nodeId: inputId, name: 'type', value: 'checkbox' })
      tx.insertChild({ parentId: bubble.rootId, childId: inputId })
      tx.addEventListener({
        nodeId: inputId,
        type: 'change',
        listener: event => {
          calls.push({ checked: event.data['checked'] })
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const input = container.childNodes[0] as FakeDomElement & {
      checked?: boolean
    }
    input.checked = true
    input.dispatchEvent({
      type: 'input',
      target: input,
      preventDefault() {},
    })

    expect(calls).toEqual([{ checked: true }])
  })

  test('bridged DOM input events on elements without tracked form state yield empty data', () => {
    const bubble = createBubble()
    const calls: Array<Record<string, unknown>> = []

    bubble.transact(tx => {
      const buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.addEventListener({
        nodeId: buttonId,
        type: 'change',
        listener: event => {
          calls.push(event.data)
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    container.dispatchEvent({
      type: 'input',
      target: container.childNodes[0] as FakeDomElement,
      preventDefault() {},
    })

    expect(calls).toEqual([{}])
  })

  test('bridged DOM input events ignore null targets', () => {
    const bubble = createBubble()
    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      container.dispatchEvent({
        type: 'input',
        target: null,
        preventDefault() {},
      })
    }).not.toThrow()
  })

  test('bridged DOM input events fail safely for non-element targets', () => {
    const bubble = createBubble()
    let wrapperId = ''

    bubble.transact(tx => {
      wrapperId = tx.createElement({ tag: 'span' })
      const textId = tx.createText({ value: 'Draft' })
      tx.insertChild({ parentId: bubble.rootId, childId: wrapperId })
      tx.insertChild({ parentId: wrapperId, childId: textId })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const wrapper = container.childNodes[0] as FakeDomElement
    const textNode = wrapper.childNodes[0] as FakeDomText

    expect(() => {
      container.dispatchEvent({
        type: 'input',
        target: textNode,
        preventDefault() {},
      })
    }).not.toThrow()
  })

  test('bridged DOM input events ignore targets whose runtime node is no longer an element', () => {
    let currentNode: BubbleElementNode | BubbleTextNode = {
      id: 'node:1',
      kind: 'element',
      tag: 'input',
      namespace: 'html',
      parentId: 'root',
      children: [],
      attributes: {},
      properties: {},
      value: '',
      checked: null,
      role: 'textbox',
      name: null,
    }
    const bubble = createProjectorTestBubble({
      getNode(nodeId) {
        return nodeId === 'node:1' ? currentNode : null
      },
      snapshot() {
        return {
          rootId: 'root',
          nodes: new Map<
            string,
            BubbleRootNode | BubbleElementNode | BubbleTextNode
          >([
            ['root', { id: 'root', kind: 'root', children: ['node:1'] }],
            ['node:1', currentNode],
          ]),
          query: {
            getById() {
              return null
            },
            getByTag() {
              return []
            },
            getByRole() {
              return []
            },
            getControlForLabel() {
              return null
            },
          },
        }
      },
    })
    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)
    currentNode = {
      id: 'node:1',
      kind: 'text',
      parentId: 'root',
      value: 'oops',
    }

    expect(() => {
      container.dispatchEvent({
        type: 'input',
        target: container.childNodes[0] as FakeDomElement,
        preventDefault() {},
      })
    }).not.toThrow()
  })

  test('bridged DOM input events ignore unknown targets', () => {
    const bubble = createBubble()
    const calls: string[] = []

    bubble.transact(tx => {
      const inputId = tx.createElement({ tag: 'input' })
      tx.insertChild({ parentId: bubble.rootId, childId: inputId })
      tx.addEventListener({
        nodeId: inputId,
        type: 'change',
        listener: () => {
          calls.push('changed')
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()
    const unknownTarget = container.ownerDocument.createElement('input')

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      container.dispatchEvent({
        type: 'input',
        target: unknownTarget,
        preventDefault() {},
      })
    }).not.toThrow()
    expect(calls).toEqual([])
  })

  test('bridged DOM submits ignore unknown targets', () => {
    const bubble = createBubble()
    const calls: string[] = []

    bubble.transact(tx => {
      const formId = tx.createElement({ tag: 'form' })

      tx.insertChild({ parentId: bubble.rootId, childId: formId })
      tx.addEventListener({
        nodeId: formId,
        type: 'submit',
        listener: () => {
          calls.push('submitted')
        },
      })
    })

    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()
    const unknownTarget = container.ownerDocument.createElement('form')

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      container.dispatchEvent({
        type: 'submit',
        target: unknownTarget,
        preventDefault() {
          unknownTarget.defaultPrevented = true
        },
      })
    }).not.toThrow()
    expect(calls).toEqual([])
    expect(unknownTarget.defaultPrevented).toBe(false)
  })

  test('bridged DOM submits ignore null targets', () => {
    const bubble = createBubble()
    const projector = createDomProjector({ bubble, bridgeEvents: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      container.dispatchEvent({
        type: 'submit',
        target: null,
        preventDefault() {
          throw new Error(
            'submit preventDefault should not be called for null targets'
          )
        },
      })
    }).not.toThrow()
  })

  test('bubble focus updates the projected DOM focus when sync is enabled', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble, syncFocus: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)
    bubble.focus(buttonId)

    expect(container.ownerDocument.activeElement).toBe(
      (container.childNodes[0] as FakeDomElement | undefined) ?? null
    )
    expect(bubble.getFocusedNodeId()).toBe(buttonId)
  })

  test('projected DOM focus updates bubble focus when sync is enabled', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble, syncFocus: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    const projectedButton = container.childNodes[0]

    if (!(projectedButton instanceof FakeDomElement)) {
      throw new Error('Expected the projected button to exist.')
    }

    projectedButton.focus()

    expect(container.ownerDocument.activeElement).toBe(projectedButton)
    expect(bubble.getFocusedNodeId()).toBe(buttonId)
  })

  test('already-synchronized projected focus is ignored safely', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble, syncFocus: true })
    const { container } = createContainer()
    const observedFocus: Array<string | null> = []

    bubble.subscribe(event => {
      if (event.type === 'focus-changed') {
        observedFocus.push(event.nodeId)
      }
    })

    projector.mount(container as unknown as HTMLElement)
    bubble.focus(buttonId)
    ;(container.childNodes[0] as FakeDomElement).dispatchEvent({
      type: 'focus',
      target: container.childNodes[0] ?? null,
      preventDefault() {},
    })

    expect(observedFocus).toEqual([buttonId])
    expect(bubble.getFocusedNodeId()).toBe(buttonId)
  })

  test('bubble blur clears the projected DOM focus when sync is enabled', () => {
    const bubble = createBubble()
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble, syncFocus: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)
    bubble.focus(buttonId)
    bubble.blur()

    expect(container.ownerDocument.activeElement).toBeNull()
    expect(bubble.getFocusedNodeId()).toBeNull()
  })

  test('focusing a detached bubble node does not throw when sync is enabled', () => {
    const bubble = createBubble()
    const detachedButtonId = bubble.transact(tx =>
      tx.createElement({ tag: 'button' })
    )
    const projector = createDomProjector({ bubble, syncFocus: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      bubble.focus(detachedButtonId)
    }).not.toThrow()
    expect(container.ownerDocument.activeElement).toBeNull()
    expect(bubble.getFocusedNodeId()).toBe(detachedButtonId)
  })

  test('null projected DOM focus targets fail safely when sync is enabled', () => {
    const bubble = createBubble()

    bubble.transact(tx => {
      const buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const projector = createDomProjector({ bubble, syncFocus: true })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => {
      ;(container.childNodes[0] as FakeDomElement).dispatchEvent({
        type: 'focus',
        target: null,
        preventDefault() {},
      })
    }).not.toThrow()
    expect(bubble.getFocusedNodeId()).toBeNull()
  })

  test('runtime focus events are ignored when focus sync is disabled', () => {
    let runtimeListener: BubbleRuntimeListener | null = null
    const bubble = createProjectorTestBubble({
      subscribe(listener: BubbleRuntimeListener) {
        runtimeListener = listener
        return () => {
          runtimeListener = null
        }
      },
    })
    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    if (runtimeListener === null) {
      throw new Error(
        'Expected the projector to subscribe to bubble runtime events.'
      )
    }
    const deliverRuntimeEvent = runtimeListener as BubbleRuntimeListener

    expect(() =>
      deliverRuntimeEvent({
        type: 'focus-changed',
        nodeId: 'node:missing',
      })
    ).not.toThrow()
    expect(container.ownerDocument.activeElement).toBeNull()
  })

  test('incremental inserts ignore stale projected siblings that were detached externally', () => {
    const bubble = createBubble()
    let firstButtonId = ''

    bubble.transact(tx => {
      firstButtonId = tx.createElement({ tag: 'button' })
      const trailingButtonId = tx.createElement({ tag: 'button' })

      tx.insertChild({ parentId: bubble.rootId, childId: firstButtonId })
      tx.insertChild({ parentId: bubble.rootId, childId: trailingButtonId })
    })

    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)
    container.removeChild(container.childNodes[1]!)

    bubble.transact(tx => {
      const insertedButtonId = tx.createElement({ tag: 'button' })

      tx.insertChild({
        parentId: bubble.rootId,
        childId: insertedButtonId,
        index: 1,
      })
    })

    expect(firstButtonId).not.toBe('')
    expect(markup()).toBe('<button></button><button></button>')
  })

  test('unmount tolerates roots whose current children were never projected', () => {
    const bubble = createProjectorTestBubble({
      getRoot() {
        return {
          id: 'root',
          kind: 'root',
          children: ['missing'],
        }
      },
    })
    const projector = createDomProjector({ bubble })
    const { container, markup } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    expect(() => projector.unmount()).not.toThrow()
    expect(markup()).toBe('')
  })

  test('mount fails clearly when the bubble snapshot references an unknown node', () => {
    const bubble = createProjectorTestBubble({
      snapshot() {
        return {
          rootId: 'root',
          nodes: new Map([
            ['root', { id: 'root', kind: 'root', children: ['missing'] }],
          ]),
          query: {
            getById() {
              return null
            },
            getByTag() {
              return []
            },
            getByRole() {
              return []
            },
            getControlForLabel() {
              return null
            },
          },
        }
      },
    })
    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    expect(() => projector.mount(container as unknown as HTMLElement)).toThrow(
      'Unknown node ID: missing'
    )
  })

  test('mount fails clearly when the bubble snapshot is missing the root node', () => {
    const bubble = createProjectorTestBubble({
      snapshot() {
        return {
          rootId: 'root',
          nodes: new Map(),
          query: {
            getById() {
              return null
            },
            getByTag() {
              return []
            },
            getByRole() {
              return []
            },
            getControlForLabel() {
              return null
            },
          },
        }
      },
    })
    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    expect(() => projector.mount(container as unknown as HTMLElement)).toThrow(
      'Bubble snapshot is missing root node root.'
    )
  })

  test('mount fails clearly when the bubble snapshot tries to project the root node as a child', () => {
    const rootNode: BubbleRootNode = {
      id: 'root',
      kind: 'root',
      children: ['root'],
    }
    const bubble = createProjectorTestBubble({
      getNode(nodeId) {
        return nodeId === 'root' ? rootNode : null
      },
      snapshot() {
        return {
          rootId: 'root',
          nodes: new Map([['root', rootNode]]),
          query: {
            getById() {
              return null
            },
            getByTag() {
              return []
            },
            getByRole() {
              return []
            },
            getControlForLabel() {
              return null
            },
          },
        }
      },
    })
    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    expect(() => projector.mount(container as unknown as HTMLElement)).toThrow(
      'Cannot project bubble root node root into the DOM.'
    )
  })

  test('incremental updates fail clearly when a text node is treated as a parent', () => {
    let runtimeListener: BubbleRuntimeListener | null = null
    const rootNode: BubbleRootNode = { id: 'root', kind: 'root', children: [] }
    const textNode: BubbleTextNode = {
      id: 'text:1',
      kind: 'text',
      parentId: 'root',
      value: 'Hello',
    }
    const childNode: BubbleElementNode = {
      id: 'node:child',
      kind: 'element',
      tag: 'span',
      namespace: 'html',
      parentId: null,
      children: [],
      attributes: {},
      properties: {},
      value: null,
      checked: null,
      role: null,
      name: null,
    }
    const bubble = createProjectorTestBubble({
      getNode(nodeId) {
        if (nodeId === 'root') return rootNode
        if (nodeId === 'text:1') return textNode
        if (nodeId === 'node:child') return childNode
        return null
      },
      snapshot() {
        return {
          rootId: 'root',
          nodes: new Map([['root', rootNode]]),
          query: {
            getById() {
              return null
            },
            getByTag() {
              return []
            },
            getByRole() {
              return []
            },
            getControlForLabel() {
              return null
            },
          },
        }
      },
      subscribe(listener: BubbleRuntimeListener) {
        runtimeListener = listener
        return () => {
          runtimeListener = null
        }
      },
    })
    const projector = createDomProjector({ bubble })
    const { container } = createContainer()

    projector.mount(container as unknown as HTMLElement)

    if (runtimeListener === null) {
      throw new Error(
        'Expected the projector to subscribe to bubble runtime events.'
      )
    }
    const deliverRuntimeEvent = runtimeListener as BubbleRuntimeListener

    expect(() =>
      deliverRuntimeEvent({
        type: 'transaction-committed',
        record: {
          sequence: 1,
          mutations: [
            {
              type: 'child-inserted',
              parentId: 'text:1',
              childId: 'node:child',
              index: 0,
            },
          ],
        },
      })
    ).toThrow('Text nodes cannot have children: text:1')
  })
})

describe('mountBubbleApp', () => {
  test('clears the container and projects the bubble tree into it', () => {
    const bubble = createBubble()

    bubble.transact(tx => {
      const buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
    })

    const { container, markup } = createContainer()
    container.appendChild(container.ownerDocument.createElement('span'))

    mountBubbleApp({
      app: { bubble, unmount: () => {} },
      container: container as unknown as HTMLElement,
    })

    expect(markup()).toBe('<button></button>')
  })

  test('unmount tears down the projector and the app', () => {
    const bubble = createBubble()
    let appUnmounted = false

    bubble.transact(tx => {
      const divId = tx.createElement({ tag: 'div' })
      tx.insertChild({ parentId: bubble.rootId, childId: divId })
    })

    const { container, markup } = createContainer()
    const mount = mountBubbleApp({
      app: {
        bubble,
        unmount: () => {
          appUnmounted = true
        },
      },
      container: container as unknown as HTMLElement,
    })

    mount.unmount()

    expect(appUnmounted).toBe(true)
    expect(markup()).toBe('')
  })

  test('bridges DOM events to bubble when bridgeEvents is true', () => {
    const bubble = createBubble()
    const calls: string[] = []
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.addEventListener({
        nodeId: buttonId,
        type: 'click',
        listener: () => {
          calls.push('clicked')
        },
      })
    })

    const { container } = createContainer()
    mountBubbleApp({
      app: { bubble, unmount: () => {} },
      container: container as unknown as HTMLElement,
      bridgeEvents: true,
    })

    const buttonElement = container.childNodes[0] as FakeDomElement
    buttonElement.dispatchEvent({
      type: 'click',
      target: buttonElement,
      preventDefault() {},
    })

    expect(calls).toEqual(['clicked'])
  })

  test('does not bridge DOM events when bridgeEvents is not set', () => {
    const bubble = createBubble()
    const calls: string[] = []
    let buttonId = ''

    bubble.transact(tx => {
      buttonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
      tx.addEventListener({
        nodeId: buttonId,
        type: 'click',
        listener: () => {
          calls.push('clicked')
        },
      })
    })

    const { container } = createContainer()
    mountBubbleApp({
      app: { bubble, unmount: () => {} },
      container: container as unknown as HTMLElement,
    })

    const buttonElement = container.childNodes[0] as FakeDomElement
    buttonElement.dispatchEvent({
      type: 'click',
      target: buttonElement,
      preventDefault() {},
    })

    expect(calls).toEqual([])
  })
})

describe('createBrowserNetwork', () => {
  test('adapts fetch responses into the bubble network shape', async () => {
    const network = createBrowserNetwork({
      fetch: (async () =>
        new Response('{"ok":true}', {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        })) as unknown as typeof globalThis.fetch,
    })

    await expect(
      network.fetch({ method: 'GET', url: 'http://example.test' })
    ).resolves.toEqual({
      status: 201,
      headers: {
        'content-type': 'application/json',
      },
      body: '{"ok":true}',
    })
  })

  test('throws when browser fetch support is unavailable', () => {
    const originalFetch = globalThis.fetch

    try {
      ;(globalThis as { fetch?: typeof globalThis.fetch }).fetch = undefined

      expect(() => createBrowserNetwork()).toThrow(
        'Expected global fetch support in the browser runtime.'
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('startBubbleReactApp', () => {
  test('creates and mounts a React app into the provided container', async () => {
    const { container, markup } = createContainer()

    const app = await startBubbleReactApp({
      container: container as unknown as HTMLElement,
      node: () => createElement('button', null, 'Save'),
    })

    expect(markup()).toBe('<button>Save</button>')

    app.unmount()

    expect(markup()).toBe('')
  })

  test('provides a default browser network capability for async startup work', async () => {
    const { container, markup } = createContainer()
    const originalFetch = globalThis.fetch

    try {
      globalThis.fetch = (async () =>
        new Response('Loaded', {
          status: 200,
          headers: {
            'content-type': 'text/plain',
          },
        })) as typeof globalThis.fetch

      const app = await startBubbleReactApp({
        container: container as unknown as HTMLElement,
        async node(bubble) {
          const response = await bubble.fetch({
            method: 'GET',
            url: '/todos',
          })

          return createElement('p', null, response.body)
        },
      })

      expect(markup()).toBe('<p>Loaded</p>')
      app.unmount()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('renders a default error node when the app bootstrap throws', async () => {
    const { container, markup } = createContainer()

    await startBubbleReactApp({
      container: container as unknown as HTMLElement,
      async node() {
        throw new Error('boom')
      },
    })

    expect(markup()).toBe('<p>boom</p>')
  })

  test('renders the generic default error node for non-Error failures', async () => {
    const { container, markup } = createContainer()

    await startBubbleReactApp({
      container: container as unknown as HTMLElement,
      async node() {
        throw 'boom'
      },
    })

    expect(markup()).toBe('<p>Failed to start the bubble app.</p>')
  })

  test('resolves the default #app container from the global document', async () => {
    const { container, markup } = createContainer()
    const originalDocument = globalThis.document

    try {
      ;(globalThis as { document?: Document }).document = {
        getElementById(id: string) {
          return id === 'app' ? (container as unknown as HTMLElement) : null
        },
      } as Document

      const app = await startBubbleReactApp({
        node: createElement('button', null, 'Default'),
      })

      expect(markup()).toBe('<button>Default</button>')
      app.unmount()
    } finally {
      ;(globalThis as { document?: Document }).document = originalDocument
    }
  })

  test('throws when the default #app container is missing', async () => {
    const originalDocument = globalThis.document

    try {
      ;(globalThis as { document?: Document }).document = {
        getElementById() {
          return null
        },
      } as unknown as Document

      await expect(
        startBubbleReactApp({
          node: createElement('button', null, 'Missing default'),
        })
      ).rejects.toThrow('Expected a root element with id "app".')
    } finally {
      ;(globalThis as { document?: Document }).document = originalDocument
    }
  })

  test('resolves a selector container through the global document', async () => {
    const { container, markup } = createContainer()
    const originalDocument = globalThis.document

    try {
      ;(globalThis as { document?: Document }).document = {
        querySelector(selector: string) {
          return selector === '#app'
            ? (container as unknown as HTMLElement)
            : null
        },
      } as unknown as Document

      const app = await startBubbleReactApp({
        container: '#app',
        node: createElement('button', null, 'Selector'),
      })

      expect(markup()).toBe('<button>Selector</button>')
      app.unmount()
    } finally {
      ;(globalThis as { document?: Document }).document = originalDocument
    }
  })

  test('throws when a selector container cannot be resolved', async () => {
    const originalDocument = globalThis.document

    try {
      ;(globalThis as { document?: Document }).document = {
        querySelector() {
          return null
        },
      } as unknown as Document

      await expect(
        startBubbleReactApp({
          container: '#missing',
          node: createElement('button', null, 'Missing'),
        })
      ).rejects.toThrow('Expected a root element matching "#missing".')
    } finally {
      ;(globalThis as { document?: Document }).document = originalDocument
    }
  })

  test('registers and removes the beforeunload cleanup listener when browser events are available', async () => {
    const { container, markup } = createContainer()
    const originalAddEventListener = globalThis.addEventListener
    const originalRemoveEventListener = globalThis.removeEventListener
    let beforeUnloadListener: (() => void) | null = null
    const removedListeners: Array<() => void> = []

    try {
      ;(
        globalThis as { addEventListener?: typeof globalThis.addEventListener }
      ).addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        if (type === 'beforeunload') {
          beforeUnloadListener = listener as () => void
        }
      }) as typeof globalThis.addEventListener
      ;(
        globalThis as {
          removeEventListener?: typeof globalThis.removeEventListener
        }
      ).removeEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        if (type === 'beforeunload') {
          removedListeners.push(listener as () => void)
        }
      }) as typeof globalThis.removeEventListener

      const app = await startBubbleReactApp({
        container: container as unknown as HTMLElement,
        node: createElement('button', null, 'Unload'),
      })

      expect(typeof beforeUnloadListener).toBe('function')

      const listener = beforeUnloadListener

      if (listener !== null) {
        ;(listener as () => void)()
      }
      expect(markup()).toBe('')

      app.unmount()

      expect(removedListeners).toEqual([beforeUnloadListener])
    } finally {
      globalThis.addEventListener = originalAddEventListener
      globalThis.removeEventListener = originalRemoveEventListener
    }
  })

  test('tolerates browsers without removeEventListener during unmount', async () => {
    const { container } = createContainer()
    const originalAddEventListener = globalThis.addEventListener
    const originalRemoveEventListener = globalThis.removeEventListener

    try {
      ;(
        globalThis as { addEventListener?: typeof globalThis.addEventListener }
      ).addEventListener = (() => {}) as typeof globalThis.addEventListener
      ;(
        globalThis as {
          removeEventListener?: typeof globalThis.removeEventListener
        }
      ).removeEventListener = undefined

      const app = await startBubbleReactApp({
        container: container as unknown as HTMLElement,
        node: createElement('button', null, 'No remove'),
      })

      expect(() => app.unmount()).not.toThrow()
    } finally {
      globalThis.addEventListener = originalAddEventListener
      globalThis.removeEventListener = originalRemoveEventListener
    }
  })
})
