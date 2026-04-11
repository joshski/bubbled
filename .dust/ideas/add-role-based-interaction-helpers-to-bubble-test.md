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

`BubbleRenderHarness` already has `click(target: BubbleNodeId)` — the role-based version would complement it, not replace it. These helpers belong in a new `BubbleSemanticInteractions` interface (parallel to `BubbleSemanticQueries`/`BubbleSemanticAssertions`), keeping semantic and low-level concerns cleanly separated, and merged into `BubbleHarness`.

## Open Questions

### What should the API surface look like?

#### Named helpers per interaction type

Ship `clickByRole(role, name)` and `changeByRole(role, name, value)` mirroring `getByRole` — concrete, discoverable, and matches the two known use cases; defer further methods until a second app surfaces new patterns.

#### One general `interact` helper

Design `interact(role, name, event, data?)` that covers arbitrary event dispatch by role and name — avoids adding new methods for every event type but is less discoverable and more abstract.
