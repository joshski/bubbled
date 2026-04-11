import { describe, expect, test } from 'vitest'

import { createBubble } from '../bubble-core'
import {
  createHarness,
  createRenderHarness,
  createSemanticAssertions,
  createSemanticQueries,
} from './index'

function requireId(value: string | null | undefined, message: string): string {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  return value
}

function createSemanticHarness(bubble = createBubble()) {
  const renderHarness = createRenderHarness(bubble)

  return Object.assign(
    renderHarness,
    createSemanticQueries(renderHarness),
    createSemanticAssertions(renderHarness)
  )
}

describe('createRenderHarness', () => {
  test('renders root content through the harness helper', () => {
    const harness = createSemanticHarness()

    harness.render({
      tag: 'button',
      attributes: { type: 'button' },
      children: ['Save'],
    })

    const buttonId = harness.getByRole('button', { name: 'Save' })
    const button = harness.bubble.getNode(buttonId)
    const textId =
      harness.bubble.getRoot().children.length === 1 &&
      button?.kind === 'element'
        ? button.children[0]
        : null
    const requiredTextId = requireId(
      textId,
      'Expected the rendered button text node to exist.'
    )

    expect(harness.bubble.getRoot().children).toEqual([buttonId])
    expect(button?.id).toBe(buttonId)
    expect(button?.kind).toBe('element')
    if (button?.kind === 'element') {
      expect(button.tag).toBe('button')
      expect(button.namespace).toBe('html')
      expect(button.parentId).toBe(harness.bubble.rootId)
      expect(button.children).toEqual([requiredTextId])
      expect(button.attributes).toEqual({ type: 'button' })
      expect(button.properties).toEqual({})
      expect(button.value).toBeNull()
      expect(button.checked).toBeNull()
      expect(button.role).toBe('button')
      expect(button.name).toBe('Save')
    }
    expect(harness.bubble.getNode(requiredTextId)).toEqual({
      id: requiredTextId,
      kind: 'text',
      parentId: buttonId,
      value: 'Save',
    })
  })

  test('re-renders compatible content by updating the existing nodes in place', () => {
    const harness = createRenderHarness()

    harness.render('first')

    const firstTextId = requireId(
      harness.bubble.getRoot().children[0],
      'Expected the first rendered text node to exist.'
    )
    const bubbleBeforeRerender = harness.bubble

    harness.render('second')

    expect(harness.bubble).toBe(bubbleBeforeRerender)
    expect(harness.bubble.getRoot().children).toEqual([firstTextId])
    expect(harness.bubble.getNode(firstTextId)).toEqual({
      id: firstTextId,
      kind: 'text',
      parentId: harness.bubble.rootId,
      value: 'second',
    })
  })

  test('re-renders compatible element trees by updating attributes, properties, and children', () => {
    const harness = createSemanticHarness()

    harness.render({
      tag: 'section',
      attributes: { 'data-state': 'draft' },
      children: [
        { tag: 'button', attributes: { type: 'button' }, children: ['Save'] },
      ],
    })

    const sectionId = requireId(
      harness.bubble.getRoot().children[0],
      'Expected the rendered section to exist.'
    )
    const buttonId = harness.getByRole('button', { name: 'Save' })

    harness.render({
      tag: 'section',
      attributes: { 'aria-label': 'Editor' },
      children: [
        {
          tag: 'button',
          attributes: { type: 'button' },
          children: ['Publish'],
        },
        {
          tag: 'input',
          attributes: { type: 'text', 'aria-label': 'Title' },
          properties: { value: 'Draft' },
        },
      ],
    })

    expect(harness.bubble.getRoot().children).toEqual([sectionId])
    expect(harness.getByRole('button', { name: 'Publish' })).toBe(buttonId)
    const textboxId = harness.getByRole('textbox', { name: 'Title' })
    const section = harness.bubble.getNode(sectionId)

    expect(section?.id).toBe(sectionId)
    expect(section?.kind).toBe('element')
    if (section?.kind === 'element') {
      expect(section.tag).toBe('section')
      expect(section.namespace).toBe('html')
      expect(section.parentId).toBe(harness.bubble.rootId)
      expect(section.children).toEqual([buttonId, textboxId])
      expect(section.attributes).toEqual({ 'aria-label': 'Editor' })
      expect(section.properties).toEqual({})
      expect(section.value).toBeNull()
      expect(section.checked).toBeNull()
      expect(section.role).toBeNull()
      expect(section.name).toBe('Editor')
    }

    const textbox = harness.bubble.getNode(textboxId)

    expect(textbox?.id).toBe(textboxId)
    expect(textbox?.kind).toBe('element')
    if (textbox?.kind === 'element') {
      expect(textbox.tag).toBe('input')
      expect(textbox.namespace).toBe('html')
      expect(textbox.parentId).toBe(sectionId)
      expect(textbox.children).toEqual([])
      expect(textbox.attributes).toEqual({
        type: 'text',
        'aria-label': 'Title',
      })
      expect(textbox.properties).toEqual({ value: 'Draft' })
      expect(textbox.value).toBe('Draft')
      expect(textbox.checked).toBeNull()
      expect(textbox.role).toBe('textbox')
      expect(textbox.name).toBe('Title')
    }

    harness.render({
      tag: 'section',
      attributes: { 'aria-label': 'Editor' },
      children: [
        {
          tag: 'button',
          attributes: { type: 'button' },
          children: ['Publish'],
        },
        {
          tag: 'input',
          attributes: { type: 'text', 'aria-label': 'Title' },
          properties: { value: 'Published' },
        },
      ],
    })

    expect(harness.getByRole('textbox', { name: 'Title' })).toBe(textboxId)
    const updatedTextbox = harness.bubble.getNode(textboxId)

    expect(updatedTextbox?.id).toBe(textboxId)
    expect(updatedTextbox?.kind).toBe('element')
    if (updatedTextbox?.kind === 'element') {
      expect(updatedTextbox.tag).toBe('input')
      expect(updatedTextbox.namespace).toBe('html')
      expect(updatedTextbox.parentId).toBe(sectionId)
      expect(updatedTextbox.children).toEqual([])
      expect(updatedTextbox.attributes).toEqual({
        type: 'text',
        'aria-label': 'Title',
      })
      expect(updatedTextbox.properties).toEqual({ value: 'Published' })
      expect(updatedTextbox.value).toBe('Published')
      expect(updatedTextbox.checked).toBeNull()
      expect(updatedTextbox.role).toBe('textbox')
      expect(updatedTextbox.name).toBe('Title')
    }

    harness.render({
      tag: 'section',
      attributes: { 'aria-label': 'Editor' },
      children: [
        {
          tag: 'button',
          attributes: { type: 'button' },
          children: ['Publish'],
        },
        {
          tag: 'input',
          attributes: { type: 'text', 'aria-label': 'Title' },
          properties: { value: 'Published' },
        },
      ],
    })

    expect(harness.getByRole('textbox', { name: 'Title' })).toBe(textboxId)
    const unchangedTextbox = harness.bubble.getNode(textboxId)

    expect(unchangedTextbox?.id).toBe(textboxId)
    expect(unchangedTextbox?.kind).toBe('element')
    if (unchangedTextbox?.kind === 'element') {
      expect(unchangedTextbox.properties).toEqual({ value: 'Published' })
      expect(unchangedTextbox.value).toBe('Published')
    }

    harness.render({
      tag: 'section',
      children: [
        {
          tag: 'button',
          children: ['Publish'],
        },
      ],
    })

    expect(harness.bubble.getNode(sectionId)).toMatchObject({
      id: sectionId,
      kind: 'element',
      children: [buttonId],
    })
    const updatedButton = harness.bubble.getNode(buttonId)

    expect(updatedButton?.kind).toBe('element')
    if (updatedButton?.kind === 'element') {
      expect(updatedButton.attributes).toEqual({})
    }
  })

  test('re-renders incompatible content by replacing nodes and trimming removed roots', () => {
    const harness = createRenderHarness()

    harness.render([
      { tag: 'button', children: ['Save'] },
      { tag: 'button', children: ['Cancel'] },
    ])

    const [saveButtonId, cancelButtonId] = harness.bubble.getRoot().children

    harness.render('Done')

    const textId = requireId(
      harness.bubble.getRoot().children[0],
      'Expected the replacement text node to exist.'
    )

    expect(harness.bubble.getRoot().children).toEqual([textId])
    expect(textId).not.toBe(saveButtonId)
    expect(textId).not.toBe(cancelButtonId)
    expect(harness.bubble.getNode(textId)).toEqual({
      id: textId,
      kind: 'text',
      parentId: harness.bubble.rootId,
      value: 'Done',
    })
  })

  test('re-renders incompatible element content by replacing the previous root node', () => {
    const harness = createRenderHarness()

    harness.render({ tag: 'button', children: ['Save'] })

    const previousRootChildId = requireId(
      harness.bubble.getRoot().children[0],
      'Expected the previous root child to exist.'
    )

    harness.render({ tag: 'section', children: ['Saved'] })

    const nextRootChildId = requireId(
      harness.bubble.getRoot().children[0],
      'Expected the next root child to exist.'
    )

    expect(nextRootChildId).not.toBe(previousRootChildId)
    expect(harness.bubble.getNode(nextRootChildId)).toMatchObject({
      id: nextRootChildId,
      kind: 'element',
      tag: 'section',
      parentId: harness.bubble.rootId,
    })
  })

  test('cleanup resets harness state', () => {
    const harness = createSemanticHarness()

    harness.render({
      tag: 'button',
      children: ['Save'],
    })
    harness.tab()

    const bubbleBeforeCleanup = harness.bubble

    harness.cleanup()

    expect(harness.bubble).not.toBe(bubbleBeforeCleanup)
    expect(harness.bubble.getRoot()).toEqual({
      id: 'root',
      kind: 'root',
      children: [],
    })
    expect(harness.bubble.getFocusedNodeId()).toBeNull()
    expect(() => harness.getByRole('button')).toThrow(
      'Unable to find a node with role "button". No nodes with that role exist in the current bubble snapshot.'
    )
  })

  test('click helper dispatches expected event', () => {
    const bubble = createBubble()
    const harness = createRenderHarness(bubble)
    const receivedEvents: Array<Record<string, unknown>> = []

    const buttonId = bubble.transact(tx => {
      const createdButtonId = tx.createElement({ tag: 'button' })

      tx.addEventListener({
        nodeId: createdButtonId,
        type: 'click',
        listener: event => {
          receivedEvents.push(event.data)
        },
      })

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId })

      return createdButtonId
    })

    const result = harness.click(buttonId)

    expect(result).toEqual({ defaultPrevented: false, delivered: true })
    expect(receivedEvents).toEqual([{}])
  })

  test('missing target produces clear failure', () => {
    const harness = createRenderHarness()

    expect(() => harness.click('missing')).toThrow(
      'Unable to dispatch "click" event. Unknown node ID: missing'
    )
  })

  test('event helper returns dispatch result', () => {
    const bubble = createBubble()
    const harness = createRenderHarness(bubble)

    const textId = bubble.transact(tx => {
      const createdTextId = tx.createText({ value: 'hello' })
      tx.insertChild({ parentId: bubble.rootId, childId: createdTextId })
      return createdTextId
    })

    expect(harness.click(textId)).toEqual({
      defaultPrevented: false,
      delivered: false,
    })
  })

  test('advances focus forward in tab order', () => {
    const bubble = createBubble()
    const harness = createRenderHarness(bubble)

    const { firstButtonId, inputId, nestedButtonId } = bubble.transact(tx => {
      const createdFirstButtonId = tx.createElement({ tag: 'button' })
      const createdContainerId = tx.createElement({ tag: 'section' })
      const createdInputId = tx.createElement({ tag: 'input' })
      const createdNestedButtonId = tx.createElement({ tag: 'button' })

      tx.insertChild({ parentId: bubble.rootId, childId: createdFirstButtonId })
      tx.insertChild({ parentId: bubble.rootId, childId: createdContainerId })
      tx.insertChild({ parentId: createdContainerId, childId: createdInputId })
      tx.insertChild({
        parentId: createdContainerId,
        childId: createdNestedButtonId,
      })

      return {
        firstButtonId: createdFirstButtonId,
        inputId: createdInputId,
        nestedButtonId: createdNestedButtonId,
      }
    })

    harness.tab()
    expect(bubble.getFocusedNodeId()).toBe(firstButtonId)

    harness.tab()
    expect(bubble.getFocusedNodeId()).toBe(inputId)

    harness.tab()
    expect(bubble.getFocusedNodeId()).toBe(nestedButtonId)
  })

  test('preserves explicit namespaces when rendering elements', () => {
    const harness = createRenderHarness()

    harness.render({
      tag: 'svg',
      namespace: 'svg',
      children: [{ tag: 'circle', namespace: 'svg' }],
    })

    const svgId = requireId(
      harness.bubble.getRoot().children[0],
      'Expected the rendered svg to exist.'
    )
    const svg = harness.bubble.getNode(svgId)
    const circleId =
      svg?.kind === 'element'
        ? requireId(svg.children[0], 'Expected the rendered circle to exist.')
        : null
    const circle = circleId === null ? null : harness.bubble.getNode(circleId)

    expect(svg?.kind).toBe('element')
    expect(circle?.kind).toBe('element')
    if (svg?.kind === 'element' && circle?.kind === 'element') {
      expect(svg.namespace).toBe('svg')
      expect(circle.namespace).toBe('svg')
    }
  })

  test('stops at the end of the tab order', () => {
    const bubble = createBubble()
    const harness = createRenderHarness(bubble)

    const { firstButtonId, secondButtonId } = bubble.transact(tx => {
      const createdFirstButtonId = tx.createElement({ tag: 'button' })
      const createdSecondButtonId = tx.createElement({ tag: 'button' })

      tx.insertChild({ parentId: bubble.rootId, childId: createdFirstButtonId })
      tx.insertChild({
        parentId: bubble.rootId,
        childId: createdSecondButtonId,
      })

      return {
        firstButtonId: createdFirstButtonId,
        secondButtonId: createdSecondButtonId,
      }
    })

    harness.tab()
    harness.tab()
    harness.tab()

    expect(firstButtonId).toBeDefined()
    expect(bubble.getFocusedNodeId()).toBe(secondButtonId)
  })

  test('moves focus backward with Shift+Tab and stops at the start', () => {
    const bubble = createBubble()
    const harness = createRenderHarness(bubble)

    const { firstButtonId, secondButtonId, thirdButtonId } = bubble.transact(
      tx => {
        const createdFirstButtonId = tx.createElement({ tag: 'button' })
        const createdSecondButtonId = tx.createElement({ tag: 'button' })
        const createdThirdButtonId = tx.createElement({ tag: 'button' })

        tx.insertChild({
          parentId: bubble.rootId,
          childId: createdFirstButtonId,
        })
        tx.insertChild({
          parentId: bubble.rootId,
          childId: createdSecondButtonId,
        })
        tx.insertChild({
          parentId: bubble.rootId,
          childId: createdThirdButtonId,
        })

        return {
          firstButtonId: createdFirstButtonId,
          secondButtonId: createdSecondButtonId,
          thirdButtonId: createdThirdButtonId,
        }
      }
    )

    harness.tab({ shift: true })
    expect(bubble.getFocusedNodeId()).toBe(thirdButtonId)

    harness.tab({ shift: true })
    expect(bubble.getFocusedNodeId()).toBe(secondButtonId)

    harness.tab({ shift: true })
    expect(bubble.getFocusedNodeId()).toBe(firstButtonId)

    harness.tab({ shift: true })
    expect(bubble.getFocusedNodeId()).toBe(firstButtonId)
  })

  test('is a no-op when no tabbable elements exist', () => {
    const bubble = createBubble()
    const harness = createRenderHarness(bubble)

    bubble.transact(tx => {
      const containerId = tx.createElement({ tag: 'section' })
      tx.insertChild({ parentId: bubble.rootId, childId: containerId })
    })

    harness.tab()
    harness.tab({ shift: true })

    expect(bubble.getFocusedNodeId()).toBeNull()
  })
})

describe('semantic helpers', () => {
  test('finds nodes by role only', () => {
    const bubble = createBubble()
    const queries = createSemanticQueries({ bubble })

    const buttonId = bubble.transact(tx => {
      const createdButtonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId })
      return createdButtonId
    })

    expect(queries.getByRole('button')).toBe(buttonId)
  })

  test('finds nodes by role and accessible name', () => {
    const bubble = createBubble()
    const queries = createSemanticQueries({ bubble })

    const saveButtonId = bubble.transact(tx => {
      const createdCancelButtonId = tx.createElement({ tag: 'button' })
      const cancelTextId = tx.createText({ value: 'Cancel' })
      const createdSaveButtonId = tx.createElement({ tag: 'button' })
      const saveTextId = tx.createText({ value: 'Save' })

      tx.insertChild({
        parentId: bubble.rootId,
        childId: createdCancelButtonId,
      })
      tx.insertChild({ parentId: createdCancelButtonId, childId: cancelTextId })
      tx.insertChild({ parentId: bubble.rootId, childId: createdSaveButtonId })
      tx.insertChild({ parentId: createdSaveButtonId, childId: saveTextId })

      return createdSaveButtonId
    })

    expect(queries.getByRole('button', { name: 'Save' })).toBe(saveButtonId)
  })

  test('finds nodes by role and accessible name pattern', () => {
    const bubble = createBubble()
    const queries = createSemanticQueries({ bubble })

    const saveButtonId = bubble.transact(tx => {
      const createdSaveButtonId = tx.createElement({ tag: 'button' })
      const saveTextId = tx.createText({ value: 'Save draft' })

      tx.insertChild({ parentId: bubble.rootId, childId: createdSaveButtonId })
      tx.insertChild({ parentId: createdSaveButtonId, childId: saveTextId })

      return createdSaveButtonId
    })

    expect(queries.getByRole('button', { name: /^Save/ })).toBe(saveButtonId)
  })

  test('reports clear output when a semantic query misses', () => {
    const bubble = createBubble()
    const queries = createSemanticQueries({ bubble })

    bubble.transact(tx => {
      const createdButtonId = tx.createElement({ tag: 'button' })
      const textId = tx.createText({ value: 'Cancel' })

      tx.insertChild({ parentId: bubble.rootId, childId: createdButtonId })
      tx.insertChild({ parentId: createdButtonId, childId: textId })
    })

    expect(() => queries.getByRole('button', { name: 'Save' })).toThrow(
      'Unable to find a node with role "button" and name "Save". Nodes with role "button": node:'
    )
    expect(() => queries.getByRole('button', { name: 'Save' })).toThrow(
      '("Cancel")'
    )
  })

  test('reports regex role misses and unnamed nodes clearly', () => {
    const renderHarness = createRenderHarness()
    const queries = createSemanticQueries(renderHarness)

    renderHarness.render({ tag: 'button' })

    expect(() => queries.getByRole('button', { name: /^Save/ })).toThrow(
      'Unable to find a node with role "button" and name /^Save/. Nodes with role "button":'
    )
    expect(() => queries.getByRole('button', { name: /^Save/ })).toThrow(
      '(<unnamed>)'
    )
  })

  test('supports semantic assertion helpers for role, name, text, focus, and form state', () => {
    const renderHarness = createRenderHarness()
    const queries = createSemanticQueries(renderHarness)
    const assertions = createSemanticAssertions(renderHarness)

    renderHarness.render({
      tag: 'form',
      children: [
        {
          tag: 'input',
          attributes: { type: 'text', name: 'email', 'aria-label': 'Email' },
          properties: { value: 'josh@example.com' },
        },
        {
          tag: 'input',
          attributes: {
            type: 'checkbox',
            name: 'subscribe',
            'aria-label': 'Subscribe',
          },
          properties: { checked: true },
        },
        { tag: 'button', children: ['Save'] },
      ],
    })

    const textboxId = queries.getByRole('textbox', { name: 'Email' })
    const form = renderHarness.bubble.getNode(
      requireId(
        renderHarness.bubble.getRoot().children[0],
        'Expected the rendered form to exist.'
      )
    )
    const checkboxId = form?.kind === 'element' ? form.children[1] : null
    const buttonId = queries.getByRole('button', { name: 'Save' })
    const buttonTextId = queries.getByText('Save')

    renderHarness.tab()

    assertions.expectRole(textboxId, 'textbox')
    assertions.expectName(textboxId, 'Email')
    assertions.expectValue(textboxId, 'josh@example.com')
    assertions.expectChecked(
      requireId(checkboxId, 'Expected the rendered checkbox node to exist.'),
      true
    )
    assertions.expectText(buttonId, 'Save')
    assertions.expectFocused(textboxId)
    assertions.expectText(buttonTextId, 'Save')
  })

  test('semantic assertion failures include useful details', () => {
    const renderHarness = createRenderHarness()
    const queries = createSemanticQueries(renderHarness)
    const assertions = createSemanticAssertions(renderHarness)

    renderHarness.render({
      tag: 'input',
      attributes: { type: 'text', 'aria-label': 'Email' },
      properties: { value: 'draft@example.com' },
    })

    const textboxId = queries.getByRole('textbox', { name: 'Email' })

    expect(() => assertions.expectName(textboxId, 'Username')).toThrow(
      `Expected accessible name for ${textboxId} to be "Username". Received "Email".`
    )
    expect(() => assertions.expectName(textboxId, 'Username')).toThrow(
      'role="textbox"'
    )
    expect(() => assertions.expectRole(textboxId, 'button')).toThrow(
      `Expected role for ${textboxId} to be "button". Received "textbox".`
    )
    expect(() =>
      assertions.expectValue(textboxId, 'published@example.com')
    ).toThrow(
      `Expected value for ${textboxId} to be "published@example.com". Received "draft@example.com".`
    )

    renderHarness.render({ tag: 'div', children: ['Status'] })
    const divId = requireId(
      renderHarness.bubble.getRoot().children[0],
      'Expected the rendered div to exist.'
    )

    expect(() => assertions.expectRole(divId, 'button')).toThrow(
      `Expected role for ${divId} to be "button". Received null.`
    )
  })

  test('semantic assertion failures describe unnamed elements clearly', () => {
    const renderHarness = createRenderHarness()
    const assertions = createSemanticAssertions(renderHarness)

    renderHarness.render({ tag: 'button' })

    const buttonId = requireId(
      renderHarness.bubble.getRoot().children[0],
      'Expected the rendered button to exist.'
    )

    expect(() => assertions.expectName(buttonId, 'Save')).toThrow(
      `Expected accessible name for ${buttonId} to be "Save". Received null.`
    )
    expect(() => assertions.expectName(buttonId, 'Save')).toThrow('name=null')
  })

  test('getByText supports regex matches and reports useful misses', () => {
    const renderHarness = createRenderHarness()
    const queries = createSemanticQueries(renderHarness)
    const assertions = createSemanticAssertions(renderHarness)

    renderHarness.render({ tag: 'button', children: ['Save draft'] })

    const matchedId = queries.getByText(/^Save/)

    assertions.expectText(matchedId, 'Save draft')
    expect(() => queries.getByText(/^Publish/)).toThrow(
      'Unable to find a node with text /^Publish/. Current root text content is "Save draft".'
    )
    expect(() => queries.getByText('Publish')).toThrow(
      'Unable to find a node with text "Publish". Current root text content is "Save draft".'
    )
  })

  test('reports useful assertion failures for focus, checked state, and non-element targets', () => {
    const renderHarness = createRenderHarness()
    const assertions = createSemanticAssertions(renderHarness)

    renderHarness.render([
      {
        tag: 'input',
        attributes: { type: 'checkbox', 'aria-label': 'Subscribe' },
        properties: { checked: true },
      },
      { tag: 'button', children: ['Save'] },
    ])

    const checkboxId = requireId(
      renderHarness.bubble.getRoot().children[0],
      'Expected the rendered checkbox to exist.'
    )
    const buttonId = requireId(
      renderHarness.bubble.getRoot().children[1],
      'Expected the rendered button to exist.'
    )
    const button = renderHarness.bubble.getNode(buttonId)
    const textId = button?.kind === 'element' ? button.children[0] : null
    const requiredTextId = requireId(
      textId,
      'Expected the rendered button text node to exist.'
    )

    expect(() => assertions.expectFocused(buttonId)).toThrow(
      `Expected focused node to be ${buttonId}. Received null.`
    )
    expect(() => assertions.expectChecked(checkboxId, false)).toThrow(
      `Expected checked state for ${checkboxId} to be false. Received true.`
    )
    expect(() => assertions.expectRole(requiredTextId, 'button')).toThrow(
      `Expected an element node for ${requiredTextId}. Received ${requiredTextId} <text "Save">.`
    )
    expect(() => assertions.expectValue('missing', 'value')).toThrow(
      'Unknown node ID: missing'
    )
  })

  test('reports root text mismatches with a root description', () => {
    const renderHarness = createRenderHarness()
    const assertions = createSemanticAssertions(renderHarness)

    renderHarness.render('Save')

    expect(() =>
      assertions.expectText(renderHarness.bubble.rootId, 'Publish')
    ).toThrow(
      `Expected text content for ${renderHarness.bubble.rootId} to be "Publish". Received "Save". ${renderHarness.bubble.rootId} <root>`
    )
  })
})

describe('createHarness', () => {
  test('composes render, query, and assertion helpers into one convenience API', () => {
    const harness = createHarness()

    harness.render({ tag: 'button', children: ['Save'] })

    const buttonId = harness.getByRole('button', { name: 'Save' })

    harness.expectRole(buttonId, 'button')
    harness.expectText(buttonId, 'Save')
  })
})
