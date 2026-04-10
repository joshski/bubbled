import { describe, expect, test } from 'bun:test'

import { createBubble } from '../bubble-core'
import { createController } from './index'

describe('createController', () => {
  test('creates a session that can be discovered by ID', async () => {
    const controller = await createController()

    const session = await controller.createSession()
    const tree = await session.query({ type: 'get-tree' })

    expect(session.id).toBe('session-1')
    expect(await controller.getSession(session.id)).toBe(session)
    expect(tree).toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: 'root',
      }),
    })
    expect(await controller.getSession('missing')).toBeNull()
  })

  test('destroy command removes the session from the controller registry', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    expect(await controller.getSession(session.id)).toBe(session)

    const destroyResult = await session.command({ type: 'destroy' })

    expect(destroyResult).toEqual({ ok: true })
    expect(await controller.getSession(session.id)).toBeNull()
    await expect(session.query({ type: 'get-tree' })).resolves.toEqual({
      ok: false,
      error: {
        code: 'session_destroyed',
        message: `Session ${session.id} has been destroyed.`,
      },
    })
  })

  test('destroy wrapper removes the session from the controller registry', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    expect(await controller.getSession(session.id)).toBe(session)

    await session.destroy()

    expect(await controller.getSession(session.id)).toBeNull()
    await expect(session.command({ type: 'reset' })).resolves.toEqual({
      ok: false,
      error: {
        code: 'session_destroyed',
        message: `Session ${session.id} has been destroyed.`,
      },
    })
  })

  test('reset command returns an explicit success result', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    expect(await session.command({ type: 'reset' })).toEqual({ ok: true })
    await expect(session.query({ type: 'get-tree' })).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: 'root',
      }),
    })
  })

  test('query reads state without mutation', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    const firstResult = await session.query({ type: 'get-tree' })
    const secondResult = await session.query({ type: 'get-tree' })

    expect(firstResult).toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: 'root',
      }),
    })
    expect(secondResult).toEqual({
      ok: true,
      value: expect.objectContaining({
        rootId: 'root',
      }),
    })
    expect(firstResult).not.toBe(secondResult)
    if (firstResult.ok && secondResult.ok) {
      expect(Array.from(firstResult.value.nodes.keys())).toEqual(['root'])
      expect(Array.from(secondResult.value.nodes.keys())).toEqual(['root'])
      expect(firstResult.value).not.toBe(secondResult.value)
      expect(firstResult.value.nodes).not.toBe(secondResult.value.nodes)
    }
  })

  test('invalid command returns a structured error', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    const result = await session.command({ type: 'explode' } as never)

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'unknown_command',
        message: 'Unknown command: explode',
        details: {
          type: 'explode',
        },
      },
    })
  })

  test('invalid query returns a structured error', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    const result = await session.query({ type: 'explode' } as never)

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'unknown_query',
        message: 'Unknown query: explode',
        details: {
          type: 'explode',
        },
      },
    })
  })

  test('reset and destroy wrappers forward structured errors after destruction', async () => {
    const controller = await createController()
    const session = await controller.createSession()

    await session.destroy()

    await expect(session.reset()).rejects.toEqual({
      code: 'session_destroyed',
      message: `Session ${session.id} has been destroyed.`,
    })
    await expect(session.destroy()).rejects.toEqual({
      code: 'session_destroyed',
      message: `Session ${session.id} has been destroyed.`,
    })
  })

  test('subscriber receives records in order', async () => {
    const bubble = createBubble()
    const controller = await createController({
      createBubble: () => bubble,
    })
    const session = await controller.createSession()
    const buttonId = bubble.transact(tx => {
      const nextButtonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: nextButtonId })
      return nextButtonId
    })
    const observedRecords: string[] = []

    session.subscribe(event => {
      switch (event.type) {
        case 'runtime':
          switch (event.event.type) {
            case 'transaction-committed':
              observedRecords.push(
                `runtime:${event.event.type}:${event.event.record.mutations.map(mutation => mutation.type).join(',')}`
              )
              break
            case 'focus-changed':
              observedRecords.push(
                `runtime:${event.event.type}:${event.event.nodeId}`
              )
              break
          }
          break
        case 'session-error':
          observedRecords.push(`error:${event.error.code}`)
          break
      }
    })

    bubble.transact(tx => {
      tx.setAttribute({ nodeId: buttonId, name: 'type', value: 'button' })
    })
    bubble.focus(buttonId)
    await session.command({ type: 'explode' } as never)

    expect(observedRecords).toEqual([
      'runtime:transaction-committed:attribute-set',
      `runtime:focus-changed:${buttonId}`,
      'error:unknown_command',
    ])
  })

  test('unsubscribe stops delivery', async () => {
    const bubble = createBubble()
    const controller = await createController({
      createBubble: () => bubble,
    })
    const session = await controller.createSession()
    const buttonId = bubble.transact(tx => {
      const nextButtonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: nextButtonId })
      return nextButtonId
    })
    const observedRecords: string[] = []
    const unsubscribe = session.subscribe(event => {
      observedRecords.push(event.type)
    })

    bubble.focus(buttonId)
    unsubscribe()
    bubble.blur()
    await session.query({ type: 'explode' } as never)

    expect(observedRecords).toEqual(['runtime'])
  })

  test('multiple subscribers are isolated', async () => {
    const bubble = createBubble()
    const controller = await createController({
      createBubble: () => bubble,
    })
    const session = await controller.createSession()
    const buttonId = bubble.transact(tx => {
      const nextButtonId = tx.createElement({ tag: 'button' })
      tx.insertChild({ parentId: bubble.rootId, childId: nextButtonId })
      return nextButtonId
    })
    const observedRecords: string[] = []

    session.subscribe(() => {
      throw new Error('subscriber failed')
    })
    session.subscribe(event => {
      observedRecords.push(event.type)
    })

    bubble.focus(buttonId)
    await session.query({ type: 'explode' } as never)

    expect(observedRecords).toEqual(['runtime', 'session-error'])
  })
})
