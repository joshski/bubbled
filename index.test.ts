import { describe, expect, test } from 'vitest'

const emptyEntrypoints = [
  './index',
  './bubble-capabilities',
  './bubble-browser',
  './bubble-control',
  './bubble-cli',
] as const

function recordGlobalKeys() {
  return new Set(
    Reflect.ownKeys(globalThis).filter(
      key =>
        typeof key === 'string' &&
        !key.startsWith('__VITEST_') &&
        !key.startsWith('__vitest_')
    )
  )
}

function expectNoNewGlobals(beforeImport: Set<PropertyKey>) {
  const addedKeys = Reflect.ownKeys(globalThis).filter(
    key =>
      !beforeImport.has(key) &&
      typeof key === 'string' &&
      !key.startsWith('__VITEST_') &&
      !key.startsWith('__vitest_')
  )

  expect(addedKeys).toEqual([])
}

describe('public entrypoints', () => {
  test('./bubble-core exposes the bubble runtime entrypoint', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-core')

    expect(Object.keys(entrypoint).sort()).toEqual([
      'createBubble',
      'createBubbleQuery',
      'serializeBubbleSnapshot',
    ])
    expect(entrypoint).toMatchObject({
      createBubble: expect.any(Function),
      createBubbleQuery: expect.any(Function),
      serializeBubbleSnapshot: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })

  test('./bubble-test exposes the test harness helper entrypoints', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-test')

    expect(Object.keys(entrypoint).sort()).toEqual([
      'createHarness',
      'createRenderHarness',
      'createSemanticAssertions',
      'createSemanticQueries',
    ])
    expect(entrypoint).toMatchObject({
      createHarness: expect.any(Function),
      createRenderHarness: expect.any(Function),
      createSemanticAssertions: expect.any(Function),
      createSemanticQueries: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })

  test('./bubble-browser exposes the DOM projector entrypoint', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-browser')

    expect(Object.keys(entrypoint).sort()).toEqual([
      'createDomLayout',
      'createDomProjector',
      'measureAndPlacePopover',
      'placePopover',
    ])
    expect(entrypoint).toMatchObject({
      createDomLayout: expect.any(Function),
      createDomProjector: expect.any(Function),
      measureAndPlacePopover: expect.any(Function),
      placePopover: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })

  test('./bubble-react exposes the React adapter entrypoint', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-react')

    expect(Object.keys(entrypoint)).toEqual(['createBubbleReactRoot'])
    expect(entrypoint).toMatchObject({
      createBubbleReactRoot: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })

  test('./bubble-control exposes the control entrypoint', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-control')

    expect(Object.keys(entrypoint)).toEqual(['createController'])
    expect(entrypoint).toMatchObject({
      createController: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })

  test('./bubble-cli exposes the CLI entrypoint', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-cli')

    expect(Object.keys(entrypoint)).toEqual(['main'])
    expect(entrypoint).toMatchObject({
      main: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })

  for (const entrypointPath of emptyEntrypoints) {
    if (
      entrypointPath === './bubble-capabilities' ||
      entrypointPath === './bubble-browser' ||
      entrypointPath === './bubble-control' ||
      entrypointPath === './bubble-cli'
    ) {
      continue
    }

    test(`${entrypointPath} imports without side effects`, async () => {
      const globalsBeforeImport = recordGlobalKeys()

      const entrypoint = await import(entrypointPath)

      expect(Object.keys(entrypoint)).toEqual([])
      expectNoNewGlobals(globalsBeforeImport)
    })
  }

  test('./bubble-capabilities exposes the capability registry entrypoint', async () => {
    const globalsBeforeImport = recordGlobalKeys()

    const entrypoint = await import('./bubble-capabilities')

    expect(Object.keys(entrypoint).sort()).toEqual([
      'BubbleUnsupportedCapabilityError',
      'createCapabilityRegistry',
    ])
    expect(entrypoint).toMatchObject({
      BubbleUnsupportedCapabilityError: expect.any(Function),
      createCapabilityRegistry: expect.any(Function),
    })
    expectNoNewGlobals(globalsBeforeImport)
  })
})
