import {
  StrictMode,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { describe, expect, test } from 'vitest'

import {
  createBubble,
  serializeBubbleSnapshot,
  type BubbleEvent,
} from '../bubble-core'
import {
  createBubbleReactRoot,
  formSubmitHandler,
  textInput,
  valueChangeHandler,
} from './index'
import { readReactClientInternals } from './react-client-internals'

function readSnapshot(bubble: ReturnType<typeof createBubble>) {
  return JSON.parse(serializeBubbleSnapshot(bubble.snapshot()))
}

describe('createBubbleReactRoot', () => {
  test('renders a static host element into the bubble root', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<button />)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [],
        },
      ],
    })
  })

  test('renders nested host elements into the bubble tree', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(
      <section>
        <button />
      </section>
    )

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'section',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'element',
              tag: 'button',
              namespace: 'html',
              attributes: {},
              properties: {},
              children: [],
            },
          ],
        },
      ],
    })
  })

  test('renders text children into text nodes', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<button>Save</button>)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Save',
            },
          ],
        },
      ],
    })
  })

  test('unmount removes the rendered tree from the bubble root', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<button>Save</button>)
    root.unmount()

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [],
    })
  })

  test('updates bubble attributes, properties, and text in place', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    const mutationTypes: string[] = []

    bubble.subscribe(event => {
      if (event.type === 'transaction-committed') {
        mutationTypes.push(
          ...event.record.mutations.map(mutation => mutation.type)
        )
      }
    })

    root.render(
      <label htmlFor="email" data-state="idle">
        <input type="text" value="first@example.com" />
        Email
      </label>
    )

    const labelId = bubble.getRoot().children[0]!
    const labelNode = bubble.getNode(labelId)

    if (labelNode === null || labelNode.kind !== 'element') {
      throw new Error('Expected a rendered label element')
    }

    const inputId = labelNode.children[0]!
    const textId = labelNode.children[1]!

    mutationTypes.length = 0

    root.render(
      <label htmlFor="name" data-state="ready">
        <input type="text" value="second@example.com" />
        Name
      </label>
    )

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'label',
          namespace: 'html',
          attributes: {
            'data-state': 'ready',
            for: 'name',
          },
          properties: {},
          children: [
            {
              kind: 'element',
              tag: 'input',
              namespace: 'html',
              attributes: {
                type: 'text',
              },
              properties: {
                value: 'second@example.com',
              },
              children: [],
            },
            {
              kind: 'text',
              value: 'Name',
            },
          ],
        },
      ],
    })
    expect(bubble.getRoot().children[0]).toBe(labelId)
    expect(
      (bubble.getNode(labelId) as { kind: string; children: string[] })
        .children[0]
    ).toBe(inputId)
    expect(
      (bubble.getNode(labelId) as { kind: string; children: string[] })
        .children[1]
    ).toBe(textId)
    expect(mutationTypes).toEqual([
      'attribute-set',
      'attribute-set',
      'property-set',
      'text-set',
    ])
  })

  test('removes omitted attributes from the bubble tree', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<button aria-label="Save" className="primary" />)
    root.render(<button className="primary" />)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {
            class: 'primary',
          },
          properties: {},
          children: [],
        },
      ],
    })
  })

  test('keeps unchanged nodes stable across prop and text updates', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(
      <section>
        <button aria-label="Save">Save</button>
        <span>Static</span>
      </section>
    )

    const sectionId = bubble.getRoot().children[0]!
    const sectionNode = bubble.getNode(sectionId)

    if (sectionNode === null || sectionNode.kind !== 'element') {
      throw new Error('Expected a rendered section element')
    }

    const buttonId = sectionNode.children[0]!
    const spanId = sectionNode.children[1]!
    const buttonNode = bubble.getNode(buttonId)
    const spanNode = bubble.getNode(spanId)

    if (
      buttonNode === null ||
      buttonNode.kind !== 'element' ||
      spanNode === null ||
      spanNode.kind !== 'element'
    ) {
      throw new Error('Expected rendered element children')
    }

    const buttonTextId = buttonNode.children[0]!
    const spanTextId = spanNode.children[0]!

    root.render(
      <section>
        <button aria-label="Submit">Submit</button>
        <span>Static</span>
      </section>
    )

    const updatedSectionNode = bubble.getNode(sectionId)
    const updatedButtonNode = bubble.getNode(buttonId)
    const updatedSpanNode = bubble.getNode(spanId)

    if (
      updatedSectionNode === null ||
      updatedSectionNode.kind !== 'element' ||
      updatedButtonNode === null ||
      updatedButtonNode.kind !== 'element' ||
      updatedSpanNode === null ||
      updatedSpanNode.kind !== 'element'
    ) {
      throw new Error('Expected updated element children')
    }

    expect(bubble.getRoot().children[0]).toBe(sectionId)
    expect(updatedSectionNode.children[0]).toBe(buttonId)
    expect(updatedSectionNode.children[1]).toBe(spanId)
    expect(updatedButtonNode.children[0]).toBe(buttonTextId)
    expect(updatedSpanNode.children[0]).toBe(spanTextId)
  })

  test('keyed reorder preserves node identity through child moves', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    const mutationTypes: string[] = []

    bubble.subscribe(event => {
      if (event.type === 'transaction-committed') {
        mutationTypes.push(
          ...event.record.mutations.map(mutation => mutation.type)
        )
      }
    })

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li key="beta">Beta</li>
        <li key="gamma">Gamma</li>
      </ul>
    )

    const listId = bubble.getRoot().children[0]!
    const listNode = bubble.getNode(listId)

    if (listNode === null || listNode.kind !== 'element') {
      throw new Error('Expected a rendered list element')
    }

    const alphaId = listNode.children[0]!
    const betaId = listNode.children[1]!
    const gammaId = listNode.children[2]!

    mutationTypes.length = 0

    root.render(
      <ul>
        <li key="gamma">Gamma</li>
        <li key="alpha">Alpha</li>
        <li key="beta">Beta</li>
      </ul>
    )

    const updatedListNode = bubble.getNode(listId)

    if (updatedListNode === null || updatedListNode.kind !== 'element') {
      throw new Error('Expected an updated list element')
    }

    expect(bubble.getRoot().children[0]).toBe(listId)
    expect(updatedListNode.children).toEqual([gammaId, alphaId, betaId])
    expect(mutationTypes).toEqual(['child-moved'])
  })

  test('removed key detaches node cleanly', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li key="beta">Beta</li>
      </ul>
    )

    const listId = bubble.getRoot().children[0]!
    const listNode = bubble.getNode(listId)

    if (listNode === null || listNode.kind !== 'element') {
      throw new Error('Expected a rendered list element')
    }

    const alphaId = listNode.children[0]!
    const betaId = listNode.children[1]!

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
      </ul>
    )

    expect(
      (bubble.getNode(listId) as { kind: string; children: string[] }).children
    ).toEqual([alphaId])
    expect(bubble.getNode(betaId)).toMatchObject({
      id: betaId,
      kind: 'element',
      tag: 'li',
      namespace: 'html',
      parentId: null,
      attributes: {},
      properties: {},
      value: null,
      checked: null,
      role: null,
      name: 'Beta',
    })
  })

  test('mixed keyed and unkeyed children still reconcile', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li>Beta</li>
      </ul>
    )

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li>Beta</li>
      </ul>
    )

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'ul',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'element',
              tag: 'li',
              namespace: 'html',
              attributes: {},
              properties: {},
              children: [
                {
                  kind: 'text',
                  value: 'Alpha',
                },
              ],
            },
            {
              kind: 'element',
              tag: 'li',
              namespace: 'html',
              attributes: {},
              properties: {},
              children: [
                {
                  kind: 'text',
                  value: 'Beta',
                },
              ],
            },
          ],
        },
      ],
    })
  })

  test('unkeyed child replacement and removal update nested children correctly', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(
      <section>
        <button>Save</button>
        <span>Extra</span>
      </section>
    )

    const sectionId = bubble.getRoot().children[0]!
    const sectionNode = bubble.getNode(sectionId)

    if (sectionNode === null || sectionNode.kind !== 'element') {
      throw new Error('Expected a rendered section element')
    }

    const originalButtonId = sectionNode.children[0]!
    const originalSpanId = sectionNode.children[1]!

    root.render(
      <section>
        <a href="/docs">Docs</a>
      </section>
    )

    const updatedSectionNode = bubble.getNode(sectionId)

    if (updatedSectionNode === null || updatedSectionNode.kind !== 'element') {
      throw new Error('Expected an updated section element')
    }

    expect(updatedSectionNode.children).toHaveLength(1)
    expect(updatedSectionNode.children[0]).not.toBe(originalButtonId)
    expect(bubble.getNode(originalButtonId)).toMatchObject({
      id: originalButtonId,
      kind: 'element',
      parentId: null,
    })
    expect(bubble.getNode(originalSpanId)).toMatchObject({
      id: originalSpanId,
      kind: 'element',
      parentId: null,
    })
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'section',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'element',
              tag: 'a',
              namespace: 'html',
              attributes: {
                href: '/docs',
              },
              properties: {},
              children: [
                {
                  kind: 'text',
                  value: 'Docs',
                },
              ],
            },
          ],
        },
      ],
    })
  })

  test('resets omitted properties to their default bubble values', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<input type="text" value="Draft" disabled />)
    root.render(<input type="text" />)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'input',
          namespace: 'html',
          attributes: {
            type: 'text',
          },
          properties: {
            disabled: false,
            value: '',
          },
          children: [],
        },
      ],
    })
  })

  test('serializes boolean host attributes as empty strings', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<button aria-hidden>Save</button>)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {
            'aria-hidden': '',
          },
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Save',
            },
          ],
        },
      ],
    })
  })

  test('replaces host nodes when their type changes', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<button>Save</button>)

    const originalId = bubble.getRoot().children[0]!

    root.render(<a href="/docs">Save</a>)

    expect(bubble.getRoot().children[0]).not.toBe(originalId)
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'a',
          namespace: 'html',
          attributes: {
            href: '/docs',
          },
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Save',
            },
          ],
        },
      ],
    })
  })

  test('fires click handlers from bubble events', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    const calls: string[] = []

    root.render(
      <button
        onClick={() => {
          calls.push('clicked')
        }}
      >
        Save
      </button>
    )

    const buttonId = bubble.getRoot().children[0]!

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: true,
      }
    )
    expect(calls).toEqual(['clicked'])
  })

  test('passes the bubble event shape to click handlers', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let receivedEvent:
      | Parameters<NonNullable<ComponentProps<'button'>['onClick']>>[0]
      | null = null

    root.render(
      <button
        onClick={event => {
          receivedEvent = event
        }}
      >
        Save
      </button>
    )

    const buttonId = bubble.getRoot().children[0]!

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    if (receivedEvent === null) {
      throw new Error('Expected the click handler to receive a bubble event.')
    }
    const bubbleEvent = receivedEvent

    expect(bubbleEvent as unknown).toEqual({
      type: 'click',
      targetId: buttonId,
      currentTargetId: buttonId,
      phase: 'target',
      cancelable: false,
      defaultPrevented: false,
      data: {},
      preventDefault: expect.any(Function),
      stopPropagation: expect.any(Function),
    })
  })

  test('keeps an unchanged click handler attached across re-renders', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    const calls: string[] = []
    const handleClick = () => {
      calls.push('clicked')
    }

    root.render(<button onClick={handleClick}>Save</button>)

    const buttonId = bubble.getRoot().children[0]!

    root.render(<button onClick={handleClick}>Submit</button>)

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: true,
      }
    )
    expect(calls).toEqual(['clicked'])
  })

  test('replaces click handlers when the prop changes', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    const calls: string[] = []

    root.render(
      <button
        onClick={() => {
          calls.push('first')
        }}
      >
        Save
      </button>
    )

    const buttonId = bubble.getRoot().children[0]!

    root.render(
      <button
        onClick={() => {
          calls.push('second')
        }}
      >
        Save
      </button>
    )

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: true,
      }
    )
    expect(calls).toEqual(['second'])
  })

  test('removes click handlers when the prop is omitted', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let callCount = 0

    root.render(
      <button
        onClick={() => {
          callCount += 1
        }}
      >
        Save
      </button>
    )

    const buttonId = bubble.getRoot().children[0]!

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: true,
      }
    )

    root.render(<button>Save</button>)

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: false,
      }
    )
    expect(callCount).toBe(1)
  })

  test('state change updates text', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Counter() {
      const [count, setCount] = useState(0)

      return (
        <button
          onClick={() => {
            setCount(value => value + 1)
          }}
        >
          Count: {count}
        </button>
      )
    }

    root.render(<Counter />)

    const buttonId = bubble.getRoot().children[0]!

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Count: ',
            },
            {
              kind: 'text',
              value: '0',
            },
          ],
        },
      ],
    })

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Count: ',
            },
            {
              kind: 'text',
              value: '1',
            },
          ],
        },
      ],
    })
  })

  test('useState supports lazy initializers', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let initializerCalls = 0

    function Counter() {
      const [count] = useState(() => {
        initializerCalls += 1
        return 2
      })

      return <button>{count}</button>
    }

    root.render(<Counter />)
    root.render(<Counter />)

    expect(initializerCalls).toBe(1)
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: '2',
            },
          ],
        },
      ],
    })
  })

  test('valueChangeHandler drives controlled input state from bubble change events', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Editor() {
      const [value, setValue] = useState('Draft')

      return (
        <input
          type="text"
          aria-label="Title"
          value={value}
          onChange={valueChangeHandler(setValue)}
        />
      )
    }

    root.render(<Editor />)

    const inputId = bubble.snapshot().query.getByRole('textbox', {
      name: 'Title',
    })[0]!.id

    bubble.dispatchEvent({
      type: 'change',
      targetId: inputId,
      data: { value: 'Published' },
    })

    const textbox = bubble.snapshot().query.getByRole('textbox', {
      name: 'Title',
    })[0]!

    expect(textbox.value).toBe('Published')
  })

  test('valueChangeHandler normalizes missing, null, undefined, and non-string values', () => {
    const received: string[] = []
    const handler = valueChangeHandler(value => {
      received.push(value)
    }) as unknown as (event: BubbleEvent) => void

    const make = (data: Record<string, unknown>): BubbleEvent => ({
      type: 'change',
      targetId: 'node',
      currentTargetId: 'node',
      phase: 'target',
      cancelable: false,
      defaultPrevented: false,
      data,
      preventDefault() {},
      stopPropagation() {},
    })

    handler(make({ value: 'hello' }))
    handler(make({ value: 42 }))
    handler(make({ value: null }))
    handler(make({ value: undefined }))
    handler(make({}))

    expect(received).toEqual(['hello', '42', '', '', ''])
  })

  test('textInput returns value and an onChange handler for controlled inputs', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Editor() {
      const [value, setValue] = useState('Draft')
      const input = textInput(value, setValue)

      return <input type="text" aria-label="Title" {...input} />
    }

    root.render(<Editor />)

    const inputId = bubble.snapshot().query.getByRole('textbox', {
      name: 'Title',
    })[0]!.id

    bubble.dispatchEvent({
      type: 'change',
      targetId: inputId,
      data: { value: 'Published' },
    })

    const textbox = bubble.snapshot().query.getByRole('textbox', {
      name: 'Title',
    })[0]!

    expect(textbox.value).toBe('Published')
  })

  test('textInput normalizes missing, null, undefined, and non-string values', () => {
    const received: string[] = []
    const input = textInput('', value => {
      received.push(value)
    })
    const handler = input.onChange as unknown as (event: BubbleEvent) => void

    const make = (data: Record<string, unknown>): BubbleEvent => ({
      type: 'change',
      targetId: 'node',
      currentTargetId: 'node',
      phase: 'target',
      cancelable: false,
      defaultPrevented: false,
      data,
      preventDefault() {},
      stopPropagation() {},
    })

    handler(make({ value: 'hello' }))
    handler(make({ value: 42 }))
    handler(make({ value: null }))
    handler(make({ value: undefined }))
    handler(make({}))

    expect(received).toEqual(['hello', '42', '', '', ''])
  })

  test('formSubmitHandler calls handler on bubble submit events', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let submitCount = 0

    root.render(
      <form
        onSubmit={formSubmitHandler(() => {
          submitCount += 1
        })}
      >
        <button type="submit">Submit</button>
      </form>
    )

    const formId = bubble.getRoot().children[0]!

    bubble.dispatchEvent({ type: 'submit', targetId: formId })

    expect(submitCount).toBe(1)
  })

  test('formSubmitHandler ignores event data and calls handler with no arguments', () => {
    let callArgs: unknown = 'not-called'
    const handler = formSubmitHandler((...args: unknown[]) => {
      callArgs = args
    }) as unknown as (event: BubbleEvent) => void

    const event: BubbleEvent = {
      type: 'submit',
      targetId: 'node',
      currentTargetId: 'node',
      phase: 'target',
      cancelable: false,
      defaultPrevented: false,
      data: { irrelevant: 'payload' },
      preventDefault() {},
      stopPropagation() {},
    }

    handler(event)

    expect(callArgs).toEqual([])
  })

  test('multiple state updates settle deterministically', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Counter() {
      const [count, setCount] = useState(0)

      return (
        <button
          onClick={() => {
            setCount(value => value + 1)
            setCount(value => value + 1)
          }}
        >
          Count: {count}
        </button>
      )
    }

    root.render(<Counter />)

    const buttonId = bubble.getRoot().children[0]!

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Count: ',
            },
            {
              kind: 'text',
              value: '2',
            },
          ],
        },
      ],
    })
  })

  test('ignores state updates that resolve to the current value', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let commitCount = 0

    bubble.subscribe(event => {
      if (event.type === 'transaction-committed') {
        commitCount += 1
      }
    })

    function Counter() {
      const [count, setCount] = useState(0)

      return (
        <button
          onClick={() => {
            setCount(0)
          }}
        >
          Count: {count}
        </button>
      )
    }

    root.render(<Counter />)

    const buttonId = bubble.getRoot().children[0]!

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(commitCount).toBe(1)
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Count: ',
            },
            {
              kind: 'text',
              value: '0',
            },
          ],
        },
      ],
    })
  })

  test('settles render-phase state updates deterministically', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Counter() {
      const [count, setCount] = useState(0)

      if (count === 0) {
        setCount(1)
      }

      return <span>{count}</span>
    }

    root.render(<Counter />)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: '1',
            },
          ],
        },
      ],
    })
  })

  test('settles re-entrant root renders deterministically', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let hasReRendered = false

    function ReentrantRender() {
      if (!hasReRendered) {
        hasReRendered = true
        root.render(<span>Second</span>)
      }

      return <span>First</span>
    }

    root.render(<ReentrantRender />)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Second',
            },
          ],
        },
      ],
    })
  })

  test('cleans up click handlers when a handled node is replaced', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let callCount = 0

    root.render(
      <button
        onClick={() => {
          callCount += 1
        }}
      >
        Save
      </button>
    )

    const buttonId = bubble.getRoot().children[0]!

    root.render(<a href="/docs">Save</a>)

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: false,
      }
    )
    expect(callCount).toBe(0)
  })

  test('cleans up nested click handlers when a subtree is removed', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let callCount = 0

    root.render(
      <section>
        <button
          onClick={() => {
            callCount += 1
          }}
        >
          Save
        </button>
      </section>
    )

    const sectionId = bubble.getRoot().children[0]!
    const sectionNode = bubble.getNode(sectionId)

    if (sectionNode === null || sectionNode.kind !== 'element') {
      throw new Error('Expected a rendered section element')
    }

    const buttonId = sectionNode.children[0]!

    root.render(<section />)

    expect(bubble.dispatchEvent({ type: 'click', targetId: buttonId })).toEqual(
      {
        defaultPrevented: false,
        delivered: false,
      }
    )
    expect(callCount).toBe(0)
  })

  test('replaces keyed nodes when their keys change', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render([<span key="first">One</span>, <span key="second">Two</span>])

    const [firstNodeId, secondNodeId] = bubble.getRoot().children

    root.render([
      <span key="third">Three</span>,
      <span key="fourth">Four</span>,
    ])

    const [thirdNodeId, fourthNodeId] = bubble.getRoot().children

    expect(thirdNodeId).not.toBe(firstNodeId)
    expect(fourthNodeId).not.toBe(secondNodeId)
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Three' }],
        },
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Four' }],
        },
      ],
    })
  })

  test('useReducer drives state transitions from dispatched actions', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    type Action = { type: 'increment' } | { type: 'reset' }

    function reducer(state: number, action: Action): number {
      if (action.type === 'increment') return state + 1
      return 0
    }

    function Counter() {
      const [count, dispatch] = useReducer(reducer, 0)

      return (
        <button onClick={() => dispatch({ type: 'increment' })}>
          Count: {count}
        </button>
      )
    }

    root.render(<Counter />)

    const buttonId = bubble.getRoot().children[0]!

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })
    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            { kind: 'text', value: 'Count: ' },
            { kind: 'text', value: '2' },
          ],
        },
      ],
    })
  })

  test('useReducer supports an init function for lazy initialization', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let initCalls = 0

    function Counter() {
      const [count] = useReducer(
        (state: number) => state,
        10,
        (n: number) => {
          initCalls += 1
          return n * 2
        }
      )

      return <span>{count}</span>
    }

    root.render(<Counter />)
    root.render(<Counter />)

    expect(initCalls).toBe(1)
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: '20' }],
        },
      ],
    })
  })

  test('useRef returns the same object across renders', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    const refs: Array<{ current: number }> = []

    function Widget() {
      const ref = useRef(42)
      refs.push(ref)
      return <span>{ref.current}</span>
    }

    root.render(<Widget />)
    root.render(<Widget />)

    expect(refs).toHaveLength(2)
    expect(refs[0]).toBe(refs[1])
  })

  test('useRef mutations persist across renders without triggering re-render', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let commitCount = 0

    bubble.subscribe(event => {
      if (event.type === 'transaction-committed') commitCount += 1
    })

    function Widget() {
      const countRef = useRef(0)
      const [label, setLabel] = useState('initial')

      return (
        <button
          onClick={() => {
            countRef.current += 1
            if (countRef.current >= 2) setLabel('ready')
          }}
        >
          {label}
        </button>
      )
    }

    root.render(<Widget />)

    const buttonId = bubble.getRoot().children[0]!
    commitCount = 0

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(commitCount).toBe(0)

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'ready' }],
        },
      ],
    })
  })

  test('useReducer ignores dispatch when reducer returns the same state', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })
    let commitCount = 0

    bubble.subscribe(event => {
      if (event.type === 'transaction-committed') commitCount += 1
    })

    function Widget() {
      const [value, dispatch] = useReducer(
        (state: number, action: 'noop') =>
          action === 'noop' ? state : state + 1,
        5
      )
      return <button onClick={() => dispatch('noop')}>{value}</button>
    }

    root.render(<Widget />)
    const buttonId = bubble.getRoot().children[0]!
    commitCount = 0

    bubble.dispatchEvent({ type: 'click', targetId: buttonId })

    expect(commitCount).toBe(0)
  })

  test('throws for unsupported built-in React element types without mutating the bubble', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(<span>Ready</span>)

    expect(() =>
      root.render(
        <StrictMode>
          <button />
        </StrictMode>
      )
    ).toThrow(
      'bubble-react only supports host elements and text nodes in this slice'
    )
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Ready' }],
        },
      ],
    })
  })

  test('throws for unsupported non-element React nodes without mutating the bubble', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    expect(() => root.render(1n as unknown as ReactNode)).toThrow(
      'bubble-react only supports host elements and text nodes in this slice'
    )
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [],
    })
  })

  test('renders fragment children as siblings', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    root.render(
      <>
        <button>Save</button>
        <span>Note</span>
      </>
    )

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Save' }],
        },
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Note' }],
        },
      ],
    })
  })

  test('renders nested fragments by flattening their children', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Toolbar() {
      return (
        <>
          <button>Save</button>
          <button>Cancel</button>
        </>
      )
    }

    root.render(<Toolbar />)

    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Save' }],
        },
        {
          kind: 'element',
          tag: 'button',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [{ kind: 'text', value: 'Cancel' }],
        },
      ],
    })
  })

  test('throws for unsupported React hooks without mutating the existing bubble tree', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    function Button() {
      useEffect(() => {})
      return <button />
    }

    root.render(<span>Ready</span>)

    expect(() => root.render(<Button />)).toThrow(
      'bubble-react only supports useState, useReducer, and useRef in this slice'
    )
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [
        {
          kind: 'element',
          tag: 'span',
          namespace: 'html',
          attributes: {},
          properties: {},
          children: [
            {
              kind: 'text',
              value: 'Ready',
            },
          ],
        },
      ],
    })
  })

  test('throws for async function components without mutating the bubble', () => {
    const bubble = createBubble()
    const root = createBubbleReactRoot({ bubble })

    async function AsyncButton() {
      return <button>Later</button>
    }

    expect(() => root.render(<AsyncButton />)).toThrow(
      'bubble-react only supports host elements and text nodes in this slice'
    )
    expect(readSnapshot(bubble)).toEqual({
      kind: 'root',
      children: [],
    })
  })

  test('throws when React client hook internals are unavailable', () => {
    expect(() =>
      readReactClientInternals({} as typeof import('react'))
    ).toThrow(
      'bubble-react could not access the React client hook dispatcher internals'
    )
  })
})
