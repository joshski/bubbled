# Add Role-Based Interaction Helpers to bubble-test

Add `clickByRole(role, name)` and `changeByRole(role, name, value)` helpers to `bubble-test`, mirroring the pattern of `BubbleSemanticQueries`. These helpers eliminate per-app boilerplate that looks up a node ID by role+name and then dispatches a click or change event.

## Context

`mountTodoApp.test.ts` and future app tests define local helpers to look up elements by role/name before dispatching events. These belong in `bubble-test` as a `BubbleSemanticInteractions` interface, parallel to `BubbleSemanticQueries` and `BubbleSemanticAssertions`, then merged into `BubbleHarness`.

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Clarity Over Brevity

Names should be descriptive and self-documenting, even if longer.

Abbreviated names like `ctx`, `deps`, `fs`, or `args` save a few keystrokes but obscure meaning. Full names like `context`, `dependencies`, `fileSystem`, and `arguments` make code immediately understandable without requiring readers to decode conventions. This is especially valuable when AI agents or new contributors read the codebase for the first time.

### Consistent Naming

Names should follow established conventions within each category to reduce cognitive load.

Principles use Title Case. File names use kebab-case. Commands use lowercase with hyphens. When naming conventions exist, follow them. When they don't, establish one and apply it consistently. Inconsistent naming creates friction for both humans and AI agents trying to predict or recall identifiers.

### Comprehensive Assertions

Assert the whole, not the parts.

When you break a complex object into many small assertions, a failure tells you *one thing that's wrong*. When you assert against the whole expected value, the diff tells you *what actually happened versus what you expected* — the full picture, in one glance.

Small assertions are like yes/no questions to a witness. A whole-object assertion is like asking "tell me what you saw."

#### In practice

Collapse multiple partial assertions into one comprehensive assertion:

```javascript
// Fragmented — each failure is a narrow keyhole
expect(result.name).toBe("Alice");
expect(result.age).toBe(30);
expect(result.role).toBe("admin");

// Whole — a failure diff tells the full story
expect(result).toEqual({
  name: "Alice",
  age: 30,
  role: "admin",
});
```

If `role` is `"user"` and `age` is `29`, the fragmented version stops at the first failure. The whole-object assertion shows both discrepancies at once, in context.

The same applies to arrays:

```javascript
// Avoid: partial assertions that hide the actual state
expect(array).toContain('apples')
expect(array).toContain('oranges')

// Prefer: one assertion that reveals the full picture on failure
expect(array).toEqual(['apples', 'oranges'])
```

### Actionable Errors

Error messages should tell you what to do next, not just what went wrong.

When something fails, the message should provide:
- A clear description of the problem
- Specific guidance on how to fix it
- Context needed to take the next step

This is especially important for AI agents, who need concrete instructions to recover autonomously. A good error message turns a dead end into a signpost.

### Co-located Tests

Test files should live next to the code they test.

When tests are co-located with their source files, developers can immediately see what's tested and what isn't. Finding the test for a module becomes trivial—it's right there in the same directory. This proximity encourages writing tests as part of the development flow rather than as an afterthought, and makes it natural to update tests when modifying code.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Comprehensive Test Coverage

A project's test suite is its primary safety net, and agents depend on it even more than humans do.

Agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness. Gaps in test coverage become gaps in agent capability — areas where changes are risky and feedback is absent. Comprehensive coverage means every meaningful behaviour is tested, so agents can make changes anywhere in the codebase with confidence.

## Implementation Notes

- Add `BubbleSemanticInteractions` interface to `bubble-test/types.ts` with:
  - `clickByRole(role: string, options?: { name?: string | RegExp }): BubbleDispatchResult`
  - `changeByRole(role: string, options: { name?: string | RegExp }, value: string): BubbleDispatchResult`
- Create `bubble-test/semantic-interactions.ts` with `createInternalSemanticInteractions`
- Export `BubbleSemanticInteractions` and `createSemanticInteractions` from `bubble-test/index.ts`
- Update `BubbleHarness` to include `BubbleSemanticInteractions`
- Include `BubbleSemanticInteractions` in `createHarness()`
- Add tests in `bubble-test/index.test.ts` covering both helpers and their error messages
- Error messages should follow the same pattern as `getByRole` (actionable, include what was found)

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- `bubble-test` exports `BubbleSemanticInteractions` with `clickByRole` and `changeByRole`
- `createHarness()` includes the new helpers
- Tests cover: successful click by role, successful change by role, error when role not found
- `bunx dust check` passes
