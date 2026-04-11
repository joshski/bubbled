# Move Todo Tests out of JSDOM and HTTP

A central goal of this framework is to make most application tests run without JSDOM or HTTP. The todo-app currently has more test surface in JSDOM and real HTTP than it needs.

## Current State

### Global JSDOM

`vitest.config.ts` sets `environment: 'jsdom'` globally. This means every test — including pure in-memory logic tests — runs inside a simulated browser. The framework exists to prevent exactly this: most tests should run in a bare Node/Bun environment.

### Tests that genuinely need JSDOM

- `bubble-browser/index.test.ts` — tests the DOM projector, but uses hand-rolled `FakeDomNode`/`FakeDomElement` stubs throughout. It may not need real JSDOM at all.
- `todo-app.test.tsx` > `defaultGlobalsTest` — uses `document.createElement` and `document.body.appendChild` to verify that `startTodoApp` defaults to real globals. Already guarded: skips when `document` is undefined.

### Tests that probably don't need JSDOM

- `bubble-core/index.test.ts` — pure in-memory bubble runtime
- `bubble-react/index.test.tsx` — reconciles React into Bubble tree; never touches real DOM
- `bubble-test/index.test.ts` — semantic assertion harness over Bubble snapshots
- `bubble-capabilities/index.test.ts`, `bubble-control/index.test.ts`, `bubble-cli/index.test.ts` — pure logic
- `todo-app/todo-store.test.ts` — pure store functions
- `todo-app.test.tsx` > `mountTodoApp` describe — all interaction via `bubble.dispatchEvent()` / `bubble.snapshot()`; no DOM involved
- `todo-app.test.tsx` > `startTodoApp` describe (except `defaultGlobalsTest`) — uses `FakeElement`, not real DOM

### HTTP surface

`server.test.ts` mixes two levels of testing in the same file:

- **Direct function tests** (`createTodoApiResponse`, `handleTodoFallbackRequest`, `createTodoRoutes`) — call server functions directly, no HTTP.
- **End-to-end HTTP tests** (`todo app Bun routes` describe) — start a real `Bun.serve()` instance and fetch against it. Of these, the test that serves the bundled client asset requires a real server (needs the build artifact). The route-correctness tests (`GET /`, `GET /api/todos`, `POST /api/todos`, `404`) duplicate what the direct function tests already cover.

### JSX and logic separation

`todo-app.tsx` is already purely presentational — all state and business logic lives in `todo-store.ts` and `todo-react.ts`. The only non-trivial code inside JSX is the `onChange` adapter that casts a Bubble event to extract `data.value`. This is small but is the one piece of logic embedded in JSX.

## Open Questions

### Should the global vitest environment change from `jsdom` to `node`?

#### Option: Change globally to `node`, annotate files that need JSDOM

Switch `vitest.config.ts` to `environment: 'node'`. Add a per-file `@vitest-environment jsdom` directive to `bubble-browser/index.test.ts` and the `defaultGlobalsTest` in `todo-app.test.tsx`. All other tests should pass unchanged if they have no hidden DOM dependencies. This makes the framework's intent explicit in the config.

#### Option: Keep `jsdom` globally

Treat it as a low-priority inconvenience rather than a correctness issue. Document which tests truly need JSDOM and which don't, but don't change the config.

### Does `bubble-browser/index.test.ts` actually need real JSDOM?

#### Option: Audit and move to `node` environment

The file defines its own `FakeDomNode`, `FakeDomElement`, and `FakeDomText` hierarchies that stub out all DOM interactions. Run the file with `environment: 'node'` and observe which (if any) tests fail. If everything passes, remove the JSDOM dependency entirely.

#### Option: Leave in `jsdom`

DOM projector tests are the one place where JSDOM might actually be appropriate as a safety net, even if stubs handle the bulk of coverage.

### Should HTTP route tests be split from unit tests?

#### Option: Remove the redundant HTTP tests, keep only the bundled-asset test

The `todo app Bun routes` describe block starts a real `Bun.serve()` instance. Most of what it tests — status codes, JSON shape, method handling — is already covered by the direct function tests in the same file. Only the bundled-asset test (`serves the bundled client asset referenced by the HTML page`) exercises something that genuinely requires a running server and a built artifact. The rest could be deleted.

#### Option: Keep all HTTP tests for end-to-end confidence

Real HTTP tests catch integration issues (routing table wiring, header handling by Bun's server) that direct function calls might miss. Treat them as a separate integration suite.

### Should the `onChange` event adapter be extracted from JSX?

#### Option: Extract to a pure function in `todo-react.ts` or `todo-store.ts`

`todo-app.tsx` contains `String(bubbleEvent.data['value'] ?? '')` inside the JSX `onChange` handler — the only non-trivial logic embedded in JSX. Extracting it makes the adapter unit-testable in isolation and removes all logic from the JSX file.

#### Option: Leave it in JSX

The adapter is a single line and is already exercised indirectly by the `mountTodoApp` tests. Extraction would add indirection without meaningful gain.
