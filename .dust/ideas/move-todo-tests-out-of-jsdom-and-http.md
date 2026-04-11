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

Running tests in `node` by default and opting specific files into `jsdom` (via Vitest's per-file `@vitest-environment jsdom` directive) would make the framework's intent explicit in the test config.

#### Option: Change globally to `node`, annotate files that need JSDOM

Switch `vitest.config.ts` to `environment: 'node'`. Add `// @vitest-environment jsdom` (or equivalent) to `bubble-browser/index.test.ts` and the one `defaultGlobalsTest` in `todo-app.test.tsx`. All other tests should pass unchanged if they have no hidden DOM dependencies.

#### Option: Keep `jsdom` globally

Treat it as a low-priority inconvenience rather than a correctness issue. Document which tests truly need JSDOM and which don't, but don't change the config.

### Does `bubble-browser/index.test.ts` actually need real JSDOM?

The file defines its own `FakeDomNode`, `FakeDomElement`, and `FakeDomText` hierarchies that stub out all DOM interactions. If these cover everything tested, the file could move to `node` environment like the rest.

#### Option: Audit and move to `node` environment

Run `bubble-browser/index.test.ts` with `environment: 'node'` and observe which (if any) tests fail. Fix or annotate failures.

#### Option: Leave in `jsdom`

DOM projector tests are the one place where JSDOM might actually be appropriate as a safety net, even if stubs handle the bulk of coverage.

### Should HTTP route tests be split from unit tests?

The `todo app Bun routes` describe block in `server.test.ts` starts a real HTTP server. Most of what it tests is already covered by the direct function tests in the same file.

#### Option: Remove the redundant HTTP tests, keep only the bundled-asset test

The route correctness tests (status codes, JSON shape) are already covered by direct function calls. Only the bundled-asset test (`serves the bundled client asset referenced by the HTML page`) exercises something that genuinely requires a running server and a built artifact. The rest could be deleted.

#### Option: Keep all HTTP tests for end-to-end confidence

Real HTTP tests catch integration issues (routing table wiring, header handling by Bun's server) that direct function calls might miss. Treat them as a separate integration suite.

### Should the `onChange` event adapter be extracted from JSX?

`todo-app.tsx` contains `String(bubbleEvent.data['value'] ?? '')` inside the JSX `onChange` handler. This is minimal but is the only non-trivial logic inside JSX.

#### Option: Extract to a pure function in `todo-react.ts` or `todo-store.ts`

Makes the adapter unit-testable in isolation and removes all logic from the JSX file.

#### Option: Leave it in JSX

The adapter is a single line and is already exercised indirectly by the `mountTodoApp` tests. Extraction would add indirection without meaningful gain.
