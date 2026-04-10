# API Sketches

This document shows how the package boundaries and abstractions from `CONVERSATION.md` and `IMPLEMENTATION_BREAKDOWN.md` might look in code.

These are illustrative TypeScript sketches, not final APIs.

The purpose is to make the architecture concrete enough that implementation work can start without confusing examples with committed design.

## Design Intent

The sketches below follow a few rules:

- `bubble-core` owns the canonical tree, transactions, events, focus state, and mutation stream.
- `bubble-capabilities` defines explicit seams for time, layout, network, storage, and similar reality-dependent behavior.
- Framework adapters render into the bubble.
- Projectors render from the bubble.
- Shells talk to a control API, not to the core internals directly.

## Package Overview

In prose, this document uses short conceptual package names like `bubble-core`.

In code examples, it uses scoped import paths like `@bubbled/bubble-core`.

That is intentional shorthand:

- `bubble-core` describes the conceptual package or module
- `@bubbled/bubble-core` shows one plausible published package name

```ts
// Conceptual package map
//
// bubble-core          -> canonical runtime and tree
// bubble-capabilities  -> capability interfaces and fakes
// bubble-test          -> test harness and semantic assertions
// bubble-browser       -> real DOM projector
// bubble-react         -> React host adapter
// bubble-control       -> session-oriented control API
// bubble-cli           -> thin shell over bubble-control
// bubble-devtools      -> inspector and timeline tooling over bubble-control
```

## Three Trees

This design has three different tree layers, and they should not be confused with one another.

### 1. Framework Tree

This is whatever the UI framework uses internally to describe UI before it reaches the host.

Examples:

- React elements and Fiber internals
- Vue virtual nodes
- Svelte compiled update instructions

This tree belongs to the framework adapter layer, not to the bubble.

### 2. Bubble Tree

This is the canonical runtime tree owned by `bubble-core`.

Examples:

- `BubbleRootNode`
- `BubbleElementNode`
- `BubbleTextNode`

This tree exists so the bubble can own:

- stable node identity
- event dispatch
- focus state
- semantic queries
- mutation records
- snapshots
- projection into real hosts

The bubble tree is the runtime truth.

### 3. Host Tree

This is any external projection target built from the bubble tree.

Examples:

- real browser DOM nodes
- serialized snapshots
- inspector views
- terminal UI output

This tree belongs to a projector, not to `bubble-core`.

### Direction of Flow

The intended direction is:

```txt
framework tree -> bubble host operations -> bubble tree -> host projector output
```

For example:

```txt
React components -> bubble-react -> BubbleElementNode tree -> bubble-browser -> real DOM
```

Not:

```txt
BubbleElementNode tree -> convert back into React tree -> DOM
```

That reverse direction is usually the wrong performance model and the wrong ownership model.

## `bubble-core`

`bubble-core` is the semantic center. It owns node identity, transactions, events, focus, and observability.

### Core Types

```ts
export type BubbleNodeId = string

export type BubbleNamespace = 'html' | 'svg'

export type BubbleNodeKind = 'root' | 'element' | 'text'

export interface BubbleRootNode {
  id: BubbleNodeId
  kind: 'root'
  children: BubbleNodeId[]
}

export interface BubbleElementNode {
  id: BubbleNodeId
  kind: 'element'
  tag: string
  namespace: BubbleNamespace
  parentId: BubbleNodeId | null
  children: BubbleNodeId[]
  attributes: Record<string, string>
  properties: Record<string, unknown>
}

export interface BubbleTextNode {
  id: BubbleNodeId
  kind: 'text'
  parentId: BubbleNodeId | null
  value: string
}

export type BubbleNode = BubbleRootNode | BubbleElementNode | BubbleTextNode
```

### Public Runtime Surface

```ts
import type { BubbleCapabilities } from '@bubbled/bubble-capabilities'

export interface CreateBubbleOptions {
  capabilities?: Partial<BubbleCapabilities>
}

export interface BubbleRuntime {
  readonly rootId: BubbleNodeId

  transact<T>(fn: (tx: BubbleTransaction) => T): T

  getNode(id: BubbleNodeId): Readonly<BubbleNode> | null
  getRoot(): Readonly<BubbleRootNode>
  snapshot(): BubbleSnapshot

  dispatchEvent(input: BubbleDispatchInput): BubbleDispatchResult

  focus(id: BubbleNodeId): void
  blur(): void
  getFocusedNodeId(): BubbleNodeId | null

  subscribe(listener: BubbleRuntimeListener): () => void
}

export function createBubble(options?: CreateBubbleOptions): BubbleRuntime
```

### Transactions and Mutation Ops

Framework adapters and internal helpers should express changes as a constrained operation set, not by mutating nodes directly.

Detached nodes may exist transiently inside a transaction before they are inserted. That is why element and text nodes have `parentId: BubbleNodeId | null`.

Some operations from the earlier architecture discussion are intentionally deferred here:

- `setStyle` is omitted for v1
- `setSelection` is omitted for v1
- `mountPortal` is omitted for v1

That is a scoping choice, not an oversight. In particular, `setStyle` should not quietly disappear into generic property or attribute writes without an explicit design decision. For an early cut, it is cleaner either to model style through explicit attributes/properties at the adapter boundary or to add a first-class `setStyle` operation later once the style semantics are clear.

```ts
export interface BubbleTransaction {
  createElement(input: {
    tag: string
    namespace?: BubbleNamespace
  }): BubbleNodeId
  createText(input: { value: string }): BubbleNodeId

  insertChild(input: {
    parentId: BubbleNodeId
    childId: BubbleNodeId
    index?: number
  }): void

  removeChild(input: { parentId: BubbleNodeId; childId: BubbleNodeId }): void

  moveChild(input: {
    parentId: BubbleNodeId
    childId: BubbleNodeId
    index: number
  }): void

  setAttribute(input: {
    nodeId: BubbleNodeId
    name: string
    value: string
  }): void

  removeAttribute(input: { nodeId: BubbleNodeId; name: string }): void

  setProperty(input: {
    nodeId: BubbleNodeId
    name: string
    value: unknown
  }): void

  setText(input: { nodeId: BubbleNodeId; value: string }): void

  addEventListener(input: {
    nodeId: BubbleNodeId
    type: string
    listener: BubbleEventListener
    capture?: boolean
  }): BubbleListenerHandle

  removeEventListener(handle: BubbleListenerHandle): void
}

export type BubbleMutation =
  | { type: 'node-created'; nodeId: BubbleNodeId; kind: BubbleNodeKind }
  | {
      type: 'child-inserted'
      parentId: BubbleNodeId
      childId: BubbleNodeId
      index: number
    }
  | {
      type: 'child-removed'
      parentId: BubbleNodeId
      childId: BubbleNodeId
      index: number
    }
  | {
      type: 'child-moved'
      parentId: BubbleNodeId
      childId: BubbleNodeId
      index: number
    }
  | { type: 'attribute-set'; nodeId: BubbleNodeId; name: string; value: string }
  | { type: 'attribute-removed'; nodeId: BubbleNodeId; name: string }
  | { type: 'property-set'; nodeId: BubbleNodeId; name: string; value: unknown }
  | { type: 'text-set'; nodeId: BubbleNodeId; value: string }
  | {
      type: 'listener-added'
      nodeId: BubbleNodeId
      eventType: string
      capture: boolean
    }
  | {
      type: 'listener-removed'
      nodeId: BubbleNodeId
      eventType: string
      capture: boolean
    }
  | { type: 'focus-set'; nodeId: BubbleNodeId | null }

export interface BubbleTransactionRecord {
  sequence: number
  mutations: BubbleMutation[]
}
```

### Events

The event system should be DOM-shaped where useful, but still explicit and intentionally smaller than the real browser.

Listener registration lives on `BubbleTransaction` intentionally. The idea is that a framework commit should be atomic: tree changes, attribute changes, and event wiring should either all commit together or all roll back together.

```ts
export interface BubbleDispatchInput {
  type: string
  targetId: BubbleNodeId
  data?: Record<string, unknown>
  cancelable?: boolean
}

export interface BubbleEvent {
  readonly type: string
  readonly targetId: BubbleNodeId
  readonly currentTargetId: BubbleNodeId
  readonly phase: 'capture' | 'target' | 'bubble'
  readonly cancelable: boolean
  readonly defaultPrevented: boolean
  readonly data: Readonly<Record<string, unknown>>

  preventDefault(): void
  stopPropagation(): void
}

export type BubbleEventListener = (event: BubbleEvent) => void

export interface BubbleDispatchResult {
  defaultPrevented: boolean
  delivered: boolean
}

export interface BubbleListenerHandle {
  readonly nodeId: BubbleNodeId
  readonly type: string
  readonly capture: boolean
  readonly internalId: string
}
```

### Snapshots and Queries

Tests, projectors, and tools should use a read-only view.

```ts
export interface BubbleSnapshot {
  rootId: BubbleNodeId
  focusedNodeId: BubbleNodeId | null
  nodes: ReadonlyMap<BubbleNodeId, Readonly<BubbleNode>>
  query: BubbleQueryApi
}

export interface BubbleQueryApi {
  getById(id: BubbleNodeId): Readonly<BubbleNode> | null
  getByTag(tag: string): ReadonlyArray<Readonly<BubbleElementNode>>
  getByRole(
    role: string,
    options?: { name?: string }
  ): ReadonlyArray<Readonly<BubbleElementNode>>
}

export function createBubbleQuery(snapshot: BubbleSnapshot): BubbleQueryApi
```

### Runtime Subscription Shape

```ts
export type BubbleRuntimeEvent =
  | { type: 'transaction-committed'; record: BubbleTransactionRecord }
  | {
      type: 'event-dispatched'
      input: BubbleDispatchInput
      result: BubbleDispatchResult
    }
  | { type: 'focus-changed'; nodeId: BubbleNodeId | null }
  | { type: 'error'; error: Error }

export type BubbleRuntimeListener = (event: BubbleRuntimeEvent) => void
```

### Example: Construct a Tree Manually

```ts
import { createBubble } from '@bubbled/bubble-core'

const bubble = createBubble()

bubble.transact(tx => {
  const buttonId = tx.createElement({ tag: 'button' })
  const textId = tx.createText({ value: 'Save' })

  tx.setAttribute({ nodeId: buttonId, name: 'type', value: 'button' })
  tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
  tx.insertChild({ parentId: buttonId, childId: textId })
})
```

## `bubble-capabilities`

Capabilities isolate reality-dependent behavior behind small interfaces.

This sketch only includes the smallest likely v1 capability set.

Other capabilities discussed earlier, such as clipboard, history/navigation, and observers, are consciously deferred until the first use cases force their shape.

### Capability Container

```ts
export interface BubbleCapabilities {
  clock: BubbleClock
  timers: BubbleTimers
  scheduler: BubbleScheduler
  layout: BubbleLayout
  viewport: BubbleViewport
  storage: BubbleStorage
  network: BubbleNetwork
}
```

### Time and Scheduling

```ts
export interface BubbleClock {
  now(): number
}

export interface BubbleTimers {
  setTimeout(callback: () => void, delayMs: number): BubbleTimerHandle
  clearTimeout(handle: BubbleTimerHandle): void
}

export interface BubbleTimerHandle {
  id: string
}

export interface BubbleScheduler {
  queueMicrotask(task: () => void): void
  requestFrame(task: (time: number) => void): BubbleFrameHandle
  cancelFrame(handle: BubbleFrameHandle): void
}

export interface BubbleFrameHandle {
  id: string
}
```

### Layout and Viewport

```ts
export interface BubbleRect {
  x: number
  y: number
  width: number
  height: number
}

export interface BubbleLayout {
  measureElement(nodeId: string): BubbleRect
}

export interface BubbleViewportState {
  width: number
  height: number
  scrollX: number
  scrollY: number
}

export interface BubbleViewport {
  getState(): BubbleViewportState
}
```

### Storage and Network

```ts
export interface BubbleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

export interface BubbleNetworkRequest {
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
}

export interface BubbleNetworkResponse {
  status: number
  headers: Record<string, string>
  body: string
}

export interface BubbleNetwork {
  fetch(request: BubbleNetworkRequest): Promise<BubbleNetworkResponse>
}
```

### Example: Deterministic Test Capabilities

```ts
import { createBubble } from '@bubbled/bubble-core'
import { createTestCapabilities } from '@bubbled/bubble-capabilities/testing'

const capabilities = createTestCapabilities({
  now: 1_700_000_000_000,
  viewport: { width: 1024, height: 768, scrollX: 0, scrollY: 0 },
})

const bubble = createBubble({ capabilities })

capabilities.timers.advanceBy(250)
capabilities.scheduler.flushMicrotasks()
```

## `bubble-test`

`bubble-test` should make deterministic tests short and semantic.

### Test Harness API

```ts
import type { BubbleRuntime, BubbleNodeId } from '@bubbled/bubble-core'

export interface BubbleHarness {
  readonly bubble: BubbleRuntime

  getByRole(role: string, options?: { name?: string | RegExp }): BubbleNodeId
  getByText(text: string | RegExp): BubbleNodeId

  click(target: BubbleNodeId): BubbleDispatchResult
  input(target: BubbleNodeId, value: string): void
  tab(options?: { shift?: boolean }): void

  expectText(target: BubbleNodeId, value: string): void
  expectFocused(target: BubbleNodeId): void
  expectValue(target: BubbleNodeId, value: string): void
}

export function createHarness(bubble?: BubbleRuntime): BubbleHarness
```

### Example: Core-Level Test

```ts
import { createBubble } from '@bubbled/bubble-core'
import { createHarness } from '@bubbled/bubble-test'

it('submits the current input value', () => {
  const bubble = createBubble()
  const harness = createHarness(bubble)

  const formId = bubble.transact(tx => {
    const form = tx.createElement({ tag: 'form' })
    const input = tx.createElement({ tag: 'input' })
    const button = tx.createElement({ tag: 'button' })
    const text = tx.createText({ value: 'Save' })

    tx.setProperty({ nodeId: input, name: 'value', value: '' })
    tx.insertChild({ parentId: bubble.rootId, childId: form })
    tx.insertChild({ parentId: form, childId: input })
    tx.insertChild({ parentId: form, childId: button })
    tx.insertChild({ parentId: button, childId: text })

    return form
  })

  const textboxId = harness.getByRole('textbox')
  const buttonId = harness.getByRole('button', { name: 'Save' })

  harness.input(textboxId, 'draft')
  const result = harness.click(buttonId)

  expect(result.defaultPrevented).toBe(false)
  expect(formId).toBeDefined()
})
```

## `bubble-browser`

`bubble-browser` projects the canonical bubble tree into a real DOM container and can translate DOM input back into bubble events.

### Projector API

```ts
import type { BubbleRuntime } from '@bubbled/bubble-core'

export interface BubbleDomProjector {
  mount(container: HTMLElement): void
  unmount(): void
}

export interface CreateDomProjectorOptions {
  bubble: BubbleRuntime
  bridgeEvents?: boolean
  syncFocus?: boolean
}

export function createDomProjector(
  options: CreateDomProjectorOptions
): BubbleDomProjector
```

### Example: Mount Bubble into the Browser DOM

```ts
import { createBubble } from '@bubbled/bubble-core'
import { createDomProjector } from '@bubbled/bubble-browser'

const bubble = createBubble()

bubble.transact(tx => {
  const heading = tx.createElement({ tag: 'h1' })
  const text = tx.createText({ value: 'Bubble Inspector' })

  tx.insertChild({ parentId: bubble.rootId, childId: heading })
  tx.insertChild({ parentId: heading, childId: text })
})

const projector = createDomProjector({
  bubble,
  bridgeEvents: true,
  syncFocus: true,
})

projector.mount(document.getElementById('app')!)
```

## `bubble-react`

`bubble-react` is a framework adapter. React renders into the bubble host instead of owning the canonical tree.

### React Entry Point

```ts
import type { ReactNode } from 'react'
import type { BubbleRuntime } from '@bubbled/bubble-core'

export interface BubbleReactRoot {
  render(node: ReactNode): void
  unmount(): void
}

export interface CreateBubbleReactRootOptions {
  bubble: BubbleRuntime
}

export function createBubbleReactRoot(
  options: CreateBubbleReactRootOptions
): BubbleReactRoot
```

### Example: React Rendering into the Bubble

```tsx
import { useState } from 'react'
import { createBubble } from '@bubbled/bubble-core'
import { createBubbleReactRoot } from '@bubbled/bubble-react'
import { createDomProjector } from '@bubbled/bubble-browser'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button type="button" onClick={() => setCount(value => value + 1)}>
      Count: {count}
    </button>
  )
}

const bubble = createBubble()
const reactRoot = createBubbleReactRoot({ bubble })
const projector = createDomProjector({ bubble, bridgeEvents: true })

reactRoot.render(<Counter />)
projector.mount(document.getElementById('app')!)
```

### Example: React Adapter Contract Test

```ts
import { createBubble } from '@bubbled/bubble-core'
import { createBubbleReactRoot } from '@bubbled/bubble-react'

it('emits bubble mutations for prop updates', () => {
  const bubble = createBubble()
  const records: string[] = []

  bubble.subscribe(event => {
    if (event.type === 'transaction-committed') {
      records.push(...event.record.mutations.map(mutation => mutation.type))
    }
  })

  const root = createBubbleReactRoot({ bubble })

  root.render('first')
  root.render('second')

  expect(records).toContain('text-set')
})
```

## `bubble-control`

`bubble-control` is the shell-facing control layer. It should be serializable, session-based, and stable.

It should also be the foundation that higher-level tooling like `bubble-devtools` sits on top of, rather than baking devtools-specific assumptions into `bubble-core`.

### Session API

```ts
import type { BubbleRuntimeEvent, BubbleSnapshot } from '@bubbled/bubble-core'

export interface BubbleSession {
  readonly id: string

  loadApp(input: BubbleAppDefinition): Promise<void>
  reset(): Promise<void>
  destroy(): Promise<void>

  command(input: BubbleCommand): Promise<BubbleCommandResult>
  query(input: BubbleQuery): Promise<BubbleQueryResult>
  artifact(input: BubbleArtifactRequest): Promise<BubbleArtifactResult>

  subscribe(listener: (event: BubbleSessionEvent) => void): () => void
}

export interface BubbleController {
  createSession(options?: CreateSessionOptions): Promise<BubbleSession>
  getSession(id: string): Promise<BubbleSession | null>
}
```

### Commands, Queries, Streams

```ts
export type BubbleCommand =
  | {
      type: 'dispatch-event'
      targetId: string
      eventType: string
      data?: Record<string, unknown>
    }
  | { type: 'focus'; targetId: string }
  | { type: 'blur' }
  | { type: 'advance-time'; ms: number }
  | { type: 'set-capability-override'; name: string; value: unknown }

export type BubbleCommandResult =
  | { ok: true; value?: unknown }
  | { ok: false; error: BubbleControlError }

export type BubbleQuery =
  | { type: 'get-tree' }
  | { type: 'get-node'; nodeId: string }
  | { type: 'get-focus' }
  | { type: 'get-accessibility-view' }

export type BubbleQueryResult =
  | { ok: true; value: unknown }
  | { ok: false; error: BubbleControlError }

export type BubbleArtifactRequest =
  | { type: 'snapshot' }
  | { type: 'trace'; traceId: string }
  | { type: 'recording'; recordingId: string }

export type BubbleArtifactResult =
  | { ok: true; artifact: BubbleArtifact }
  | { ok: false; error: BubbleControlError }

export type BubbleArtifact =
  | { type: 'snapshot'; value: BubbleSnapshot }
  | { type: 'trace'; value: unknown }
  | { type: 'recording'; value: unknown }

export type BubbleSessionEvent =
  | { type: 'runtime'; event: BubbleRuntimeEvent }
  | { type: 'snapshot-updated'; snapshot: BubbleSnapshot }
  | { type: 'session-error'; error: BubbleControlError }

export interface BubbleControlError {
  code: string
  message: string
  details?: Record<string, unknown>
}
```

### Example: Session-Oriented Usage

```ts
import { createController } from '@bubbled/bubble-control'

const controller = await createController()
const session = await controller.createSession()

await session.command({
  type: 'dispatch-event',
  targetId: 'node-17',
  eventType: 'click',
})

const tree = await session.query({ type: 'get-tree' })

if (tree.ok) {
  console.log(tree.value)
}

const snapshot = await session.artifact({ type: 'snapshot' })

if (snapshot.ok && snapshot.artifact.type === 'snapshot') {
  console.log(snapshot.artifact.value.rootId)
}
```

## `bubble-cli`

The CLI should stay thin. It is a shell over `bubble-control`, not a second core.

### Example CLI Shape

```txt
bubble run ./example-app
bubble inspect --session abc123
bubble query get-tree --json
bubble dispatch click --target node-17
bubble time advance 250
```

### Example CLI Wiring

```ts
import { createController } from '@bubbled/bubble-control'

export async function main(argv: string[]): Promise<number> {
  const controller = await createController()
  const session = await controller.createSession()

  const [command, ...rest] = argv

  if (command === 'query' && rest[0] === 'get-tree') {
    const result = await session.query({ type: 'get-tree' })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return result.ok ? 0 : 1
  }

  process.stderr.write(`Unknown command: ${argv.join(' ')}\n`)
  return 1
}
```

## Example End-to-End Flow

This example is meant to show where app logic should live. In this architecture:

- app logic lives in framework-neutral modules
- React or Vue provide view bindings
- the bubble is the runtime target underneath those bindings

So a realistic example looks like this.

### Shared App Logic

This code is plain TypeScript. It is not React-specific, Vue-specific, or bubble-specific.

```ts
export interface SaveDraftPort {
  saveDraft(input: { body: string }): Promise<{ savedAt: string }>
}

export interface ComposerState {
  body: string
  status: 'idle' | 'saving' | 'saved' | 'error'
  savedAt: string | null
  errorMessage: string | null
}

export interface ComposerApp {
  getState(): ComposerState
  subscribe(listener: () => void): () => void
  setBody(body: string): void
  save(): Promise<void>
}

export function createComposerApp(port: SaveDraftPort): ComposerApp {
  let state: ComposerState = {
    body: '',
    status: 'idle',
    savedAt: null,
    errorMessage: null,
  }

  const listeners = new Set<() => void>()

  const publish = () => {
    for (const listener of listeners) listener()
  }

  const setState = (next: ComposerState) => {
    state = next
    publish()
  }

  return {
    getState() {
      return state
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    setBody(body) {
      setState({
        ...state,
        body,
        status: 'idle',
        errorMessage: null,
      })
    },

    async save() {
      setState({
        ...state,
        status: 'saving',
        errorMessage: null,
      })

      try {
        const result = await port.saveDraft({ body: state.body })

        setState({
          ...state,
          status: 'saved',
          savedAt: result.savedAt,
          errorMessage: null,
        })
      } catch (error) {
        setState({
          ...state,
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  }
}
```

The important part is that `"idle" | "saving" | "saved" | "error"` lives here, once.

If we later add a Vue adapter, it should reuse this module. Vue would not reimplement save-state rules. It would only re-render the current `ComposerState` and call `setBody()` or `save()`.

### React View Over the Shared App

```tsx
import { useSyncExternalStore } from 'react'

function ComposerView({ app }: { app: ComposerApp }) {
  const state = useSyncExternalStore(app.subscribe, app.getState, app.getState)

  return (
    <form>
      <label>
        Message
        <textarea
          value={state.body}
          onChange={event => app.setBody(event.currentTarget.value)}
        />
      </label>

      <button type="button" onClick={() => void app.save()}>
        Save Draft
      </button>

      <output>
        {state.status === 'saving' && 'Saving...'}
        {state.status === 'saved' && `Saved at ${state.savedAt}`}
        {state.status === 'error' && state.errorMessage}
        {state.status === 'idle' && 'Nothing saved yet'}
      </output>
    </form>
  )
}
```

React is only doing view composition and event binding here.

### Vue View Over the Same Shared App

```ts
import { onMounted, onUnmounted, ref } from 'vue'

export function useComposerApp(app: ComposerApp) {
  const state = ref(app.getState())
  let unsubscribe: null | (() => void) = null

  onMounted(() => {
    unsubscribe = app.subscribe(() => {
      state.value = app.getState()
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return {
    state,
    setBody: app.setBody,
    save: app.save,
  }
}
```

Same app logic, different view binding.

### Bubble Wiring

Now the bubble concern becomes simpler: it hosts whichever framework adapter we choose.

```tsx
import { createBubble } from '@bubbled/bubble-core'
import { createTestCapabilities } from '@bubbled/bubble-capabilities/testing'
import { createBubbleReactRoot } from '@bubbled/bubble-react'
import { createDomProjector } from '@bubbled/bubble-browser'

const app = createComposerApp({
  async saveDraft({ body }) {
    return { savedAt: `saved:${body.length}` }
  },
})

const capabilities = createTestCapabilities()
const bubble = createBubble({ capabilities })

const reactRoot = createBubbleReactRoot({ bubble })
reactRoot.render(<ComposerView app={app} />)

const projector = createDomProjector({
  bubble,
  bridgeEvents: true,
  syncFocus: true,
})

projector.mount(document.getElementById('app')!)
```

If we later had `bubble-vue`, the app module would stay the same. Only the view layer and adapter setup would change.

### What This Example Is Trying to Show

- The bubble is not where business rules live.
- React is not where business rules must live either.
- The reusable app model can sit above both.
- The adapter's job is to map framework output into bubble operations.
- The projector's job is to map bubble state into a real host like the DOM.

## Example Pure Logic Boundary

Layout-sensitive logic should stay outside the component where possible.

```ts
export interface PlacementInput {
  anchor: BubbleRect
  overlay: BubbleRect
  viewport: BubbleViewportState
}

export interface PlacementOutput {
  x: number
  y: number
  placement: 'top' | 'bottom'
}

export function placePopover(input: PlacementInput): PlacementOutput {
  const fitsBelow =
    input.anchor.y + input.anchor.height + input.overlay.height <=
    input.viewport.height

  if (fitsBelow) {
    return {
      x: input.anchor.x,
      y: input.anchor.y + input.anchor.height,
      placement: 'bottom',
    }
  }

  return {
    x: input.anchor.x,
    y: input.anchor.y - input.overlay.height,
    placement: 'top',
  }
}
```

Then integration code can call the layout capability explicitly:

```ts
function measureAndPlacePopover(
  layout: BubbleLayout,
  viewport: BubbleViewport,
  anchorId: string,
  overlayId: string
) {
  return placePopover({
    anchor: layout.measureElement(anchorId),
    overlay: layout.measureElement(overlayId),
    viewport: viewport.getState(),
  })
}
```

## Overlapping Terminal and React UIs

If a terminal UI and a React UI overlap in functionality but are not identical, the overlap should be represented in shared app state and commands, not by forcing both shells to share one identical rendered tree.

### Shared App Core

The common behavior lives in a framework-neutral module.

```ts
export interface FileLike {
  name: string
  size: number
}

export interface ComposerState {
  body: string
  status: 'idle' | 'saving' | 'saved' | 'error'
  attachments: FileLike[]
  canSave: boolean
  statusText: string
}

export interface ComposerCommands {
  setBody(body: string): void
  save(): Promise<void>
  attachFiles?(files: FileLike[]): Promise<void>
}

export interface ComposerApp extends ComposerCommands {
  getState(): ComposerState
  subscribe(listener: () => void): () => void
}
```

This layer owns:

- message body rules
- save workflow
- validation
- derived state such as `canSave`
- status messaging

### React UI

The React UI can expose richer interactions if the shell supports them.

```tsx
function ComposerReactView({ app }: { app: ComposerApp }) {
  const state = useSyncExternalStore(app.subscribe, app.getState, app.getState)

  return (
    <section>
      <label>
        Message
        <textarea
          value={state.body}
          onChange={event => app.setBody(event.currentTarget.value)}
        />
      </label>

      <button
        type="button"
        disabled={!state.canSave}
        onClick={() => void app.save()}
      >
        Save Draft
      </button>

      {app.attachFiles && (
        <button
          type="button"
          onClick={() =>
            void app.attachFiles?.([{ name: 'notes.txt', size: 128 }])
          }
        >
          Attach File
        </button>
      )}

      <output>{state.statusText}</output>
    </section>
  )
}
```

### Terminal UI

The terminal UI can expose the same core intent through different controls.

```ts
export interface TerminalKeybinding {
  key: string
  run(): void | Promise<void>
}

export function createComposerTerminalView(app: ComposerApp) {
  return {
    render(): string {
      const state = app.getState()

      return [
        'Compose Message',
        '',
        `Body: ${state.body}`,
        `Status: ${state.statusText}`,
        `Attachments: ${state.attachments.length}`,
        '',
        'Ctrl-S Save',
        app.attachFiles ? 'Ctrl-A Attach' : '',
      ]
        .filter(Boolean)
        .join('\n')
    },

    keybindings(): TerminalKeybinding[] {
      return [
        {
          key: 'Ctrl-S',
          run: () => app.save(),
        },
        ...(app.attachFiles
          ? [
              {
                key: 'Ctrl-A',
                run: () =>
                  app.attachFiles?.([{ name: 'terminal.txt', size: 64 }]),
              },
            ]
          : []),
      ]
    },
  }
}
```

These shells overlap in intent:

- edit body
- save draft
- show status

But they do not need to overlap in rendering:

- React may use buttons, drag/drop, focus rings, and pointer interactions
- terminal may use keybindings, text output, and line-oriented controls

### Optional Capabilities

Different shells can expose different capabilities without forking the app’s core rules.

```ts
export interface ComposerEnvironment {
  attachments: 'supported' | 'unsupported'
}

export function createComposerAppForEnvironment(
  env: ComposerEnvironment
): ComposerApp {
  if (env.attachments === 'supported') {
    return createComposerAppWithAttachments()
  }

  return createComposerAppWithoutAttachments()
}
```

In practice, a cleaner version is often to keep one app and inject optional ports or commands rather than branching the whole app factory. The important point is that capability differences should be explicit.

### Package Shape for This Case

```ts
// conceptual app packages
//
// composer-core          -> state, commands, async workflows
// composer-react-ui      -> React view bindings
// composer-terminal-ui   -> terminal view bindings
// bubble-react           -> renders React UI into bubble
// bubble-terminal        -> renders terminal UI into a terminal host
```

### Key Rule

Share:

- state machine
- commands
- validation
- async workflows
- derived presentation state

Do not force-share:

- exact element hierarchy
- exact event mechanics
- exact focus behavior
- shell-specific affordances

The overlap belongs in the app model. The divergence belongs in the shell-specific view layer.

## Likely Early Public APIs

If we keep the first implementation disciplined, the earliest public surface might be as small as:

```ts
// bubble-core
createBubble()

// bubble-test
createHarness()

// bubble-browser
createDomProjector()

// bubble-react
createBubbleReactRoot()

// bubble-control
createController()
```

Everything else can stay internal until the behavior is proven by tests.

## What Should Probably Stay Internal at First

These details are useful in implementation, but should likely not be part of the first stable public API:

- Internal node storage shape
- Listener registry details
- Transaction rollback machinery
- React host config details
- DOM projector node caches
- Subscription fan-out internals
- Test harness failure formatting internals

## Guiding Principle

The canonical model should live in the bubble, not in React, not in the browser DOM, and not in the CLI.

Frameworks translate in.
Projectors translate out.
Shells control and observe.
