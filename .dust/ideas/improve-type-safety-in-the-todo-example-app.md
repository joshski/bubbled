# Improve Type Safety in the Todo Example App

Several places in the todo example app use `unknown` types or unchecked type assertions where stronger typing is possible. Tightening these would surface bugs earlier and reduce reliance on runtime type casts.

## Findings

### Unsafe JSON casts

Two places cast parsed JSON directly to `readonly TodoItem[]` without runtime validation:

- `todo-store.ts:37` — `JSON.parse(rawStored) as readonly TodoItem[]` (hydrating from storage)
- `start-todo-app.ts:49` — `(await response.json()) as readonly TodoItem[]` (hydrating from the API response)

In both cases the `as` assertion silences the type checker but provides no safety if the stored or returned data has an unexpected shape.

### `TodoAppContainer.appendChild` typed as `unknown`

`start-todo-app.ts:13–15` defines:

```ts
export interface TodoAppContainer {
  replaceChildren(): void
  appendChild(node: unknown): unknown
}
```

The only value ever passed to `appendChild` is a `TodoAppTextNode`, and the return value is never used. The parameter could be typed as `TodoAppTextNode` and the return dropped to `void`, which would eliminate the `node as TodoAppTextNode` cast in the test stub (`start-todo-app.test.ts:22`).

### `persisted as string` in tests

`todo-store.test.ts:105` checks `persisted` is not null and then must still use `persisted as string` for `JSON.parse`. This is a minor narrowing gap that could be addressed alongside other type safety work.

### `TodoFetchResponse.json()` returns `Promise<unknown>`

This is intentional — the interface deliberately leaves the response shape open — but it forces the caller to assert the return type. A generic overload or domain-specific method would let the cast happen once in a well-defined place rather than inline at the call site.

## Open Questions

### Should JSON parsed from storage and the API be validated at runtime?

#### Option: Add a schema validator dependency

The `as` casts in `todo-store.ts` and `start-todo-app.ts` assume the stored/fetched JSON always matches `TodoItem[]`. Introduce a lightweight schema library (e.g. valibot or zod) and validate at the two parse sites. Errors would surface with clear messages instead of silent wrong-state behaviour.

#### Option: Write a hand-rolled guard function

Add a `isTodoItemArray(value: unknown): value is readonly TodoItem[]` guard in the domain layer. No new dependency, but the guard must be kept in sync with `TodoItem` manually.

#### Option: Leave the casts as-is

Accept that the todo app is an example, not production code, and that the casts are an acceptable shortcut for illustrative purposes. Document the assumption explicitly with a comment.

### Should `TodoAppContainer.appendChild` accept `TodoAppTextNode` instead of `unknown`?

#### Option: Type as `TodoAppTextNode`

Replace `node: unknown` with `node: TodoAppTextNode` and drop the return value to `void`. Typing the parameter as `TodoAppTextNode` removes the cast in the test stub and makes the interface self-documenting. The browser implementation already passes a `<p>` element which satisfies the interface structurally.

#### Option: Introduce a generic `TodoAppNode` union or interface

Create a broader node interface so `appendChild` can accept more than one type of node in future without reverting to `unknown`.

#### Option: Keep `unknown` and the cast

The interface intentionally mirrors the loose DOM API surface, and keeping it `unknown` keeps it easy to stub in tests without coupling to specific node types.
