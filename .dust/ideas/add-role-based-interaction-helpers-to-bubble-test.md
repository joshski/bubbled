# Add Role-Based Interaction Helpers to bubble-test

`mountTodoApp.test.ts` defines local helpers that look up elements by ARIA role/name and then dispatch events. These helpers sit one level above what `bubble-test` currently exposes and are general enough to belong in the framework.

## Context

`bubble-test` exports `createHarness()` with a `click(targetId)` method that takes a raw node ID. Tests that want to click by a human-readable role name must first resolve the ID:

```ts
// current pattern in mountTodoApp.test.ts
const findButton = (name: string): string =>
  app.bubble.snapshot().query.getByRole('button', { name })[0]!.id

const click = (name: string): void => {
  app.bubble.dispatchEvent({ type: 'click', targetId: findButton(name) })
}

const changeTextbox = (name: string, value: string): void => {
  const textboxId = app.bubble
    .snapshot()
    .query.getByRole('textbox', { name })[0]!.id
  app.bubble.dispatchEvent({ type: 'change', targetId: textboxId, data: { value } })
}
```

Every app test that dispatches events will reconstruct similar helpers. The higher-level `getByRole`/`getByText` queries already live in `bubble-test` as `BubbleSemanticQueries`. Adding matching *interaction* helpers (click by role+name, change textbox by role+name) closes that gap.

`BubbleRenderHarness` already has `click(target: BubbleNodeId)` — the role-based version would complement it, not replace it.

## Open Questions

### Should these helpers go on BubbleRenderHarness or be a separate interface?

#### Option

Add them to `BubbleRenderHarness` alongside the existing `click(targetId)` — fewest moving parts, single interface.

#### Option

Introduce a `BubbleSemanticInteractions` interface (parallel to `BubbleSemanticQueries`/`BubbleSemanticAssertions`) and merge it into `BubbleHarness` — keeps semantic and low-level concerns cleanly separated.

### What should the API surface look like?

Two known use cases: click a button by name, change a textbox by name. It is unclear whether the todo app is the right scope to drive the full API or if more examples are needed first.

#### Option

Ship only `clickByName(role, name)` and `changeTextbox(name, value)` to match the exact todo app usage — defer generalization until a second app surfaces more patterns.

#### Option

Design a more general `interact(role, name, event, data?)` that covers arbitrary event dispatch by role and name — avoids adding new methods for every event type.
