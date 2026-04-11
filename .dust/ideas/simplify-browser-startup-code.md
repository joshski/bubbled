---
name: Simplify browser startup code
description: Remove injection complexity from todo-browser.ts and its tests
type: idea
---

# Simplify browser startup code

`startTodoApp` in `todo-browser.ts` accepts five injected dependencies to stay unit-testable without a DOM. This results in:
- Three interface definitions for duck-typed DOM objects (`TodoAppTextNodeLike`, `TodoAppMountContainerLike`, `TodoAppDocumentLike`)
- `isDefaultMountContainer` — a one-liner that exists only to be swappable
- `renderStartupError` — extracted solely because it needs the injectable document
- `todo-browser.test.ts` — 289 lines of fake DOM nodes, global mock/restore pairs, and edge-case scaffolding

The project's goal is to run no tests in a DOM. The current approach achieves this by building a heavy injection harness instead of using a real DOM. But `startTodoApp` is thin wiring — it calls `loadInitialTodos`, `createBubble`, `createTodoStore`, `mountTodoApp`, and `createDomProjector`. All of the meaningful behavior is tested elsewhere. The startup function itself adds little value as a unit test subject.

## Context

`client.ts` is the only production caller:
```ts
import { startTodoApp } from './todo-browser.ts'
await startTodoApp()
```

The `beforeunload` cleanup, error rendering, and container lookup are all startup concerns that could alternatively be verified through a real browser test (Playwright/Puppeteer) or left untested as integration glue.

## Proposed Change

- Remove the five injectable parameters from `startTodoApp`; have it read `globalThis.document`, `globalThis.fetch`, and `globalThis.addEventListener` directly
- Remove the three duck-typed DOM interfaces
- Remove `isDefaultMountContainer` (inline `instanceof HTMLElement`)
- Remove `renderStartupError` (inline the three-line body)
- Delete `todo-browser.test.ts`

## Open Questions

### Should any startup behavior be tested at all?

#### Option: Delete the tests entirely
`startTodoApp` becomes untested integration glue. All meaningful logic is covered elsewhere. The file becomes much shorter.

#### Option: Keep a single smoke-test via a real browser test
Use Playwright to load the served app and assert the page renders a heading and empty list. Covers the startup path without DOM mocks.

#### Option: Keep the injection API but remove some test cases
Keep the injected options but prune tests that exercise edge cases (missing container, non-Error thrown, etc.) that are unlikely in practice.

### Should `loadInitialTodos` stay as a named function?

#### Option: Inline `loadInitialTodos` into `startTodoApp`
It's a two-liner called in one place. Inlining removes the named function without losing readability.

#### Option: Keep it named
Retains a descriptive name for the async fetch step.
