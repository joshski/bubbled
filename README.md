# bubbled

`bubbled` is an experiment in making UI runtime behavior deterministic, inspectable, and portable.

Instead of treating the browser DOM as the source of truth, bubbled keeps a canonical "bubble" tree in memory and lets adapters project that tree into real hosts like the DOM. That gives you a place to own events, focus, timers, storage, network, snapshots, and control surfaces without depending on ambient browser state.

## Why use it

Most UI stacks make it easy to render markup, but harder to answer questions like:

- How do I test interactive behavior without a browser full of hidden state?
- How do I inspect the current UI tree in a stable, serializable way?
- How do I keep timers, storage, network, and viewport behavior explicit?
- How do I bridge framework output into a runtime I can control?

`bubbled` is aimed at those problems.

It gives you:

- A deterministic runtime in [`bubble-core`](./bubble-core/index.ts)
- Explicit capability seams for time, layout, storage, network, and viewport in [`bubble-capabilities`](./bubble-capabilities/index.ts)
- A small React host adapter in [`bubble-react`](./bubble-react/index.ts)
- A DOM projector that can bridge clicks, submits, and focus in [`bubble-browser`](./bubble-browser/index.ts)
- A session-oriented control API and CLI in [`bubble-control`](./bubble-control/index.ts) and [`bubble-cli`](./bubble-cli/index.ts)

## What this is good for

Use bubbled when you want UI behavior that is more scriptable than the browser normally allows.

- Testing UI flows with deterministic timers, storage, and scripted network
- Building devtools or inspectors around a stable runtime snapshot
- Rendering through React while keeping runtime ownership outside React internals
- Projecting the same runtime into the browser without giving up control of events and focus
- Experimenting with UI runtimes where the "real app state" should not live in the DOM

## Practical examples

### 1. Inspect the current UI tree

If you want a stable serialized snapshot of the current runtime tree:

```ts
import { createBubble, serializeBubbleSnapshot } from './bubble-core'

const bubble = createBubble()

bubble.transact(tx => {
  const buttonId = tx.createElement({ tag: 'button' })
  const textId = tx.createText({ value: 'Save' })

  tx.insertChild({ parentId: buttonId, childId: textId })
  tx.insertChild({ parentId: bubble.rootId, childId: buttonId })
})

console.log(serializeBubbleSnapshot(bubble.snapshot()))
```

That is useful when you want tests, tooling, or logs to describe UI state without scraping live DOM.

### 2. Start a React app with a familiar browser entrypoint

If you want a browser app that still routes rendering and events through the bubble runtime:

```tsx
import { startBubbleReactApp } from './bubble-browser'
import { useStorage } from './bubble-react'

function TodoApp() {
  const storage = useStorage()

  return (
    <button
      onClick={() => {
        storage.setItem('saved', 'true')
      }}
    >
      Save
    </button>
  )
}

await startBubbleReactApp({
  node: <TodoApp />,
})
```

This keeps the app-facing code close to normal React, while the runtime stays inspectable and deterministic underneath.

### 3. Project into the browser and bridge real DOM events back into the runtime

If you want a real DOM view while keeping the bubble as the source of truth:

```ts
import { createBubble } from './bubble-core'
import { createDomProjector } from './bubble-browser'

const bubble = createBubble()
const projector = createDomProjector({
  bubble,
  bridgeEvents: true,
  syncFocus: true,
})

projector.mount(document.getElementById('app') as HTMLElement)
```

This helps when you want native browser interaction, but you still want clicks, submits, and focus changes to flow through an explicit runtime.

### 4. Test logic with explicit time, storage, and network

If you want runtime behavior to depend on injected capabilities instead of ambient globals:

```ts
import { createBubble } from './bubble-core'

const bubble = createBubble({
  capabilities: {
    clock: { now: () => 1_700_000_000_000 },
  },
})

bubble.resolveCapability('storage').setItem('draft', 'hello')

const handle = bubble.setTimeout(() => {
  console.log('timer fired')
}, 100)
```

That makes behavior easier to script in tests and easier to reason about in tooling.

## Current shape

This repository is still early and intentionally narrow. The implemented slices today focus on:

- Canonical tree ownership, transactions, snapshots, and event propagation
- Deterministic timers, microtasks, storage, viewport, and scripted network
- React host rendering for host elements, text, and a limited hook/event surface
- Browser projection with bridged `click` and `submit` events plus focus sync
- Session-based control and CLI querying

The project is small on purpose: each slice is built as an observable behavior with tests.

## Development

Install dependencies:

```bash
bun install
```

Run tests:

```bash
bun test
```

Lint the code:

```bash
bun run lint
```

Apply the same formatting workflow used in `dustbucket`:

```bash
bun run format
```
