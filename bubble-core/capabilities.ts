import {
  createCapabilityRegistry,
  type BubbleCapabilities,
  type BubbleCapabilityName,
  type BubbleNetworkRequest,
  type BubbleNetworkResponse,
  type BubbleRect,
  type BubbleTimerHandle,
  type BubbleViewportListener,
  type BubbleViewportState,
} from '../bubble-capabilities'

const DEFAULT_VIEWPORT_STATE: BubbleViewportState = Object.freeze({
  width: 1024,
  height: 768,
  scrollX: 0,
  scrollY: 0,
})

function snapshotViewportState(
  state: BubbleViewportState
): BubbleViewportState {
  return Object.freeze({ ...state })
}

function createStorageCapability() {
  const storage = new Map<string, string>()

  return Object.freeze({
    getItem(key: string): string | null {
      return storage.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      storage.set(key, value)
    },
    removeItem(key: string): void {
      storage.delete(key)
    },
    clear(): void {
      storage.clear()
    },
  })
}

export interface BubbleCapabilityRuntime {
  resolveCapability<Name extends BubbleCapabilityName>(
    name: Name
  ): BubbleCapabilities[Name]
  now(): number
  setTimeout(callback: () => void, delayMs: number): BubbleTimerHandle
  clearTimeout(handle: BubbleTimerHandle): void
  queueMicrotask(task: () => void): void
  measureElement(nodeId: string): BubbleRect
  getViewportState(): BubbleViewportState
  subscribeToViewport(listener: BubbleViewportListener): () => void
  fetch(request: BubbleNetworkRequest): Promise<BubbleNetworkResponse>
}

export function createBubbleCapabilityRuntime(
  capabilities: Partial<BubbleCapabilities> = {}
): BubbleCapabilityRuntime {
  const capabilityRegistry = createCapabilityRegistry({
    storage: createStorageCapability(),
    viewport: {
      getState() {
        return DEFAULT_VIEWPORT_STATE
      },
    },
    ...capabilities,
  })

  return Object.freeze({
    resolveCapability<Name extends BubbleCapabilityName>(
      name: Name
    ): BubbleCapabilities[Name] {
      return capabilityRegistry.resolveCapability(name)
    },
    now(): number {
      return capabilityRegistry.resolveCapability('clock').now()
    },
    setTimeout(callback: () => void, delayMs: number): BubbleTimerHandle {
      return capabilityRegistry
        .resolveCapability('timers')
        .setTimeout(callback, delayMs)
    },
    clearTimeout(handle: BubbleTimerHandle): void {
      capabilityRegistry.resolveCapability('timers').clearTimeout(handle)
    },
    queueMicrotask(task: () => void): void {
      capabilityRegistry.resolveCapability('scheduler').queueMicrotask(task)
    },
    measureElement(nodeId: string): BubbleRect {
      return capabilityRegistry
        .resolveCapability('layout')
        .measureElement(nodeId)
    },
    getViewportState(): BubbleViewportState {
      return snapshotViewportState(
        capabilityRegistry.resolveCapability('viewport').getState()
      )
    },
    subscribeToViewport(listener: BubbleViewportListener): () => void {
      const viewport = capabilityRegistry.resolveCapability('viewport')

      if (viewport.subscribe === undefined) {
        return () => {}
      }

      return viewport.subscribe(state => {
        listener(snapshotViewportState(state))
      })
    },
    async fetch(request: BubbleNetworkRequest): Promise<BubbleNetworkResponse> {
      return capabilityRegistry.resolveCapability('network').fetch(request)
    },
  })
}
