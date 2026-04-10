# Implementation Breakdown

This document turns the ideas in `CONVERSATION.md` into a sequence of very small implementation tasks.

The goal is to build the runtime incrementally, with each task adding one observable behavior and landing only with full automated coverage.

## Delivery Rules

Every task should follow these rules:

1. Add one new behavior or one tightly related behavior set.
2. Ship tests in the same change as the behavior.
3. Keep coverage at 100% for statements, branches, functions, and lines for the whole repo while it is still small.
4. Test both the happy path and the failure path for every public API added.
5. Fail loudly for unsupported features instead of returning fake placeholder values.
6. Prefer in-process tests first; only add browser-backed tests when the behavior depends on browser reality.
7. Do not add a new shell, adapter, or projector until the underlying core behavior already exists and is tested.

## Test Strategy

Use four test layers, but add them in this order:

1. Core unit tests
   Test the tree, mutations, events, transactions, capabilities, and errors in isolation.
2. Core integration tests
   Test multi-step flows like render, dispatch, focus changes, and form submission.
3. Adapter contract tests
   Verify that React or any future framework adapter produces the expected bubble operations.
4. Browser verification tests
   Keep these small and targeted. Only cover layout, real DOM projection, and platform boundaries.

## Suggested Package Shape

Start with these packages, but only create each package when the first task needs it:

- `bubble-core`
- `bubble-capabilities`
- `bubble-test`
- `bubble-browser`
- `bubble-react`
- `bubble-control`
- `bubble-cli`

## Phase 0: Guardrails

### Task 01: Test runner and coverage gate

Behavior:
- The repo can run tests and fail if coverage drops below 100%.

Tests:
- A smoke test that proves the test command runs.
- Coverage thresholds enforced in configuration and CI.

### Task 02: Public entrypoints exist

Behavior:
- The initial package entrypoints can be imported without side effects.

Tests:
- Import tests for each entrypoint.
- Verify that importing does not mutate globals or throw.

## Phase 1: Bubble Core Tree

### Task 03: Create an empty bubble instance

Behavior:
- `createBubble()` returns a root node with no children and stable root metadata.

Tests:
- Root exists and has the expected shape.
- Two bubble instances do not share state.
- External callers cannot mutate internal state by accident.

### Task 04: Stable node IDs

Behavior:
- Every node created by the bubble gets a stable ID owned by the bubble.

Tests:
- IDs are unique within an instance.
- IDs remain stable across read operations.
- IDs are not reused after node removal in the same session.

### Task 05: Create element nodes

Behavior:
- The runtime can create an element node with tag and namespace metadata.

Tests:
- Element shape is correct.
- Invalid tag input is rejected.
- Namespace defaults are explicit and tested.

### Task 06: Create text nodes

Behavior:
- The runtime can create text nodes.

Tests:
- Text node shape is correct.
- Empty text is allowed if that is the chosen contract.
- Invalid text input is rejected.

### Task 07: Insert a child node

Behavior:
- A child can be inserted into a parent at a specific index.

Tests:
- Insert into empty parent.
- Insert at front, middle, and end.
- Reject insert into invalid parent types.
- Reject cross-instance insertion.

### Task 08: Remove a child node

Behavior:
- A child can be removed from its parent.

Tests:
- Remove only child.
- Remove first, middle, and last child.
- Removed node is detached cleanly.
- Reject removing a node that is not a child of the parent.

### Task 09: Move a child node

Behavior:
- Existing children can be reordered without replacing identity.

Tests:
- Move forward and backward.
- Node ID remains unchanged after move.
- Reject moves with invalid indices.

### Task 10: Set and remove attributes

Behavior:
- Elements support attribute mutation through bubble operations only.

Tests:
- Set new attribute.
- Update existing attribute.
- Remove attribute.
- Reject attributes on unsupported node types.

### Task 11: Set properties

Behavior:
- Elements support explicit property mutation separate from attributes.

Tests:
- Property set and overwrite.
- Attribute and property storage are independent.
- Reject unsupported property targets.

### Task 12: Update text node content

Behavior:
- Text nodes can be updated in place.

Tests:
- Text updates preserve node identity.
- Empty string handling is correct.
- Reject text updates on element nodes.

## Phase 2: Transactions and Observability

### Task 13: Begin and commit transactions

Behavior:
- Mutations happen inside a transaction boundary and become visible on commit.

Tests:
- Uncommitted changes are not visible to subscribers.
- Committed changes are visible atomically.
- Nested transactions are either supported or rejected explicitly.

### Task 14: Roll back failed transactions

Behavior:
- A failed transaction leaves the tree unchanged.

Tests:
- Throw during mutation application and verify no partial state leaks.
- Confirm node identities and child order are preserved after rollback.

### Task 15: Mutation records

Behavior:
- Committed changes produce a deterministic mutation record stream.

Tests:
- Single-op transaction record.
- Multi-op transaction record ordering.
- Empty transactions emit nothing or an explicit no-op record, whichever is chosen.

### Task 16: Read-only tree snapshots

Behavior:
- Callers can inspect the current tree through a stable, read-only snapshot API.

Tests:
- Snapshot contains current structure.
- Snapshot updates after commit.
- Mutating snapshot data does not mutate runtime state.

## Phase 3: Events

### Task 17: Register and remove event listeners

Behavior:
- Elements can add and remove listeners for named events.

Tests:
- Add listener and receive event.
- Remove listener and verify it no longer fires.
- Multiple listeners on the same node fire in registration order.

### Task 18: Dispatch events to a target

Behavior:
- The runtime can dispatch an event at a specific node.

Tests:
- Target listener receives event data.
- Dispatch to missing node fails clearly.
- Event object exposes type and target.

### Task 19: Capture and bubble phases

Behavior:
- Event propagation follows capture then target then bubble.

Tests:
- Parent capture runs before target.
- Parent bubble runs after target.
- Current target is correct at each step.

### Task 20: `stopPropagation`

Behavior:
- A listener can stop further propagation.

Tests:
- Stop during capture.
- Stop at target.
- Ensure already-run listeners are not rewound.

### Task 21: `preventDefault`

Behavior:
- A listener can cancel default handling and the dispatch result reflects that.

Tests:
- Default prevented state is visible to later listeners.
- Dispatch result reports cancellation.
- Non-cancelable events behave as specified.

### Task 22: Listener error handling

Behavior:
- Listener exceptions do not corrupt runtime state and are surfaced consistently.

Tests:
- Thrown listener error is captured or rethrown according to contract.
- Later listeners run or do not run according to the chosen policy.
- Tree state remains unchanged.

## Phase 4: Focus and Basic Interaction Semantics

### Task 23: Explicit focus

Behavior:
- `focus(nodeId)` marks one node as focused.

Tests:
- Focusing a focusable node sets active focus.
- Focusing a second node clears the first.
- Reject non-focusable targets.

### Task 24: Blur

Behavior:
- `blur()` clears active focus.

Tests:
- Blur clears focus when one node is active.
- Blur is safe when nothing is focused.

### Task 25: Focus and blur events

Behavior:
- Focus changes emit the appropriate events in a deterministic order.

Tests:
- Focus event fires on focus target.
- Blur event fires on previous target.
- Switching focus produces the agreed ordering.

### Task 26: Basic tab order

Behavior:
- The runtime can compute tab order for simple focusable elements.

Tests:
- Natural DOM order.
- `tabIndex` overrides where supported.
- Disabled elements are skipped.

### Task 27: Simulated tab navigation

Behavior:
- The test harness can advance focus using tab semantics.

Tests:
- Forward tab progression.
- Wrap or stop behavior according to contract.
- Shift+Tab if included in v1.

## Phase 5: Semantics and Queries

### Task 28: Query by node ID and simple selectors

Behavior:
- Callers can locate nodes via stable IDs and a minimal query API.

Tests:
- Query existing and missing nodes.
- Query by tag.
- Query returns read-only views.

### Task 29: Basic role derivation

Behavior:
- Elements expose derived semantic roles for core HTML controls.

Tests:
- Button role.
- Link role.
- Textbox role.
- Unknown elements fall back predictably.

### Task 30: Accessible name derivation

Behavior:
- Core controls expose an accessible name from text content or `aria-label`.

Tests:
- Name from text.
- Name from `aria-label`.
- Attribute precedence is explicit and tested.

### Task 31: Query by role and name

Behavior:
- The test harness can find nodes using semantic queries.

Tests:
- Query by role only.
- Query by role and name.
- Missing match produces clear failure output.

## Phase 6: Form State

### Task 32: Input value property

Behavior:
- Text inputs store and expose a value property.

Tests:
- Default empty value.
- Set value.
- Reject value on non-input nodes if that is the contract.

### Task 33: Checkbox checked state

Behavior:
- Checkbox inputs support a checked property.

Tests:
- Default unchecked state.
- Set checked and unchecked.
- Serialize checked state correctly.

### Task 34: Label to control association

Behavior:
- Labels can resolve their associated control.

Tests:
- Explicit `for` association.
- Nested control association.
- Missing control fails cleanly.

### Task 35: Label click forwarding

Behavior:
- Clicking a label forwards activation to its associated control.

Tests:
- Forward click to explicit target.
- Forward click to nested target.
- Verify event order if the contract defines it.

### Task 36: Form submission payload

Behavior:
- Forms can serialize their controls into a deterministic payload.

Tests:
- Text input submission.
- Checkbox inclusion rules.
- Disabled controls excluded.

### Task 37: Submit event

Behavior:
- Dispatching submit on a form emits a submit event and returns the serialized payload if not canceled.

Tests:
- Successful submit returns payload.
- `preventDefault` cancels the submit result.
- Invalid form target is rejected.

## Phase 7: Capability Boundaries

### Task 38: Capability registry

Behavior:
- A bubble instance can be created with explicit capabilities.

Tests:
- Registered capability can be resolved.
- Missing capability throws a named unsupported error.
- Instances do not share capability state accidentally.

### Task 39: Deterministic clock

Behavior:
- The runtime can use an injected clock instead of ambient time.

Tests:
- `now()` returns fake time.
- Advancing fake time updates reads deterministically.
- No implicit `Date.now()` usage leaks into tests.

### Task 40: Timer capability

Behavior:
- Timeout scheduling runs against the injected clock.

Tests:
- Timer fires only after advancement.
- Multiple timers fire in order.
- Cancelled timers do not fire.

### Task 41: Microtask or scheduler queue

Behavior:
- The runtime can queue deterministic deferred work.

Tests:
- Queue and flush scheduled work.
- Work ordering is explicit and tested.
- Re-entrant scheduling behavior is covered.

### Task 42: Layout capability as an explicit seam

Behavior:
- Layout reads go through a capability interface and throw unless mocked.

Tests:
- Unconfigured layout read throws.
- Mocked layout returns configured geometry.
- Call arguments are captured for assertion.

### Task 43: Viewport capability

Behavior:
- The runtime can read a deterministic viewport model.

Tests:
- Default viewport.
- Override viewport.
- Subscribers see viewport changes if that is supported.

### Task 44: Storage capability

Behavior:
- The runtime can access deterministic storage through an interface.

Tests:
- Read missing key.
- Write and read back.
- Per-session isolation.

### Task 45: Network capability

Behavior:
- The runtime can issue scripted network requests through an injected interface.

Tests:
- Successful response.
- Error response.
- Unscripted request fails loudly.

## Phase 8: Test Harness

### Task 46: Harness render helper

Behavior:
- Tests can render a bubble tree through a small harness API instead of manual node operations.

Tests:
- Render root content.
- Re-render replaces or updates according to contract.
- Harness cleanup resets state.

### Task 47: Harness event helper

Behavior:
- Tests can trigger bubble events through a high-level helper.

Tests:
- Click helper dispatches expected event.
- Missing target produces clear failure.
- Event helper returns dispatch result.

### Task 48: Harness semantic assertions

Behavior:
- Tests can assert role, name, text, focus, and form state through helper APIs.

Tests:
- Passing assertion examples.
- Failing assertion shows useful error details.

## Phase 9: Projection Out of the Bubble

### Task 49: Snapshot projector

Behavior:
- The bubble tree can be projected to a stable serialized format.

Tests:
- Snapshot contains tree structure.
- Attributes, properties, and text serialize correctly.
- Snapshot order is deterministic.

### Task 50: Real DOM projector mount

Behavior:
- The bubble tree can mount into a real DOM container.

Tests:
- Initial mount creates expected DOM.
- Text and attributes appear correctly.
- Cleanup removes projected nodes.

### Task 51: Real DOM projector updates

Behavior:
- Bubble mutations update the projected DOM incrementally.

Tests:
- Insert, remove, move, and text updates reflect in DOM.
- Node identity is preserved where expected.

### Task 52: DOM-to-bubble event bridge

Behavior:
- Browser DOM events can be translated back into bubble events.

Tests:
- Click in DOM reaches bubble listener.
- Event target mapping is correct.
- Unknown DOM targets fail safely.

### Task 53: Projected focus sync

Behavior:
- Focus state can stay synchronized between bubble and projected DOM.

Tests:
- Bubble focus updates DOM focus.
- DOM focus event updates bubble focus if that path is supported.

## Phase 10: React as the First Adapter

### Task 54: Minimal React host mount

Behavior:
- A React tree can render simple elements into the bubble host.

Tests:
- Static element render.
- Nested children render.
- Text children render.

### Task 55: React prop updates

Behavior:
- React updates map to bubble attribute, property, and text mutations.

Tests:
- Prop change updates bubble tree.
- Removed prop is removed in bubble.
- Unchanged nodes keep identity where expected.

### Task 56: React event handlers

Behavior:
- Bubble events can trigger React handlers.

Tests:
- Click handler fires.
- Handler receives expected event shape.
- Removed handler no longer fires.

### Task 57: React state updates

Behavior:
- React local state updates re-render through the bubble host.

Tests:
- State change updates text.
- Multiple state updates settle deterministically.

### Task 58: React keyed reordering

Behavior:
- React keyed children reorder through bubble move operations rather than full replacement where possible.

Tests:
- Keyed reorder preserves node identity.
- Removed key detaches node cleanly.

## Phase 11: Control API and Shells

### Task 59: In-process control API

Behavior:
- A session API can create, reset, inspect, and destroy bubble instances.

Tests:
- Create session.
- Reset session.
- Destroy session and reject further use.

### Task 60: Command/query separation

Behavior:
- Control operations are exposed as commands and queries with explicit result types.

Tests:
- Command mutates state.
- Query reads state without mutation.
- Invalid command returns structured error.

### Task 61: Stream subscriptions

Behavior:
- Control clients can subscribe to mutations, events, and errors.

Tests:
- Subscriber receives records in order.
- Unsubscribe stops delivery.
- Multiple subscribers are isolated.

### Task 62: CLI wrapper

Behavior:
- A CLI can invoke the control API for one-shot commands.

Tests:
- Human-readable output mode.
- JSON output mode.
- Exit code behavior on success and failure.

## Phase 12: Browser Reality Checks

### Task 63: Layout-sensitive browser verification tests

Behavior:
- Real browser tests validate the first layout-dependent feature that the bubble cannot model fully.

Tests:
- Pick one concrete feature, such as popover placement.
- Verify both bubble-side pure logic and browser-side final integration.

### Task 64: Real browser focus verification

Behavior:
- Browser tests verify the first focus behavior where browser semantics matter more than the bubble model.

Tests:
- Use one narrow case, such as label/input focus transfer or tab order edge cases.

### Task 65: Real browser form verification

Behavior:
- Browser tests verify the first form behavior that depends on native browser behavior.

Tests:
- Use one narrow case, such as default submit behavior or checkbox serialization quirks.

## Definition of Done for Each Task

Every task is done only when all of the following are true:

1. The behavior is implemented behind the smallest public API that can express it.
2. The behavior has direct unit coverage.
3. Error paths and invariant violations are covered.
4. Coverage remains at 100%.
5. Any unsupported edge is explicit in code and tested.
6. Public behavior is documented either in code comments or a short README update if needed.

## Recommended Delivery Order

If we want the fastest path to a meaningful v1, stop after these checkpoints and evaluate:

- After Task 16: we have a transactional tree with observability.
- After Task 27: we have events and focus semantics.
- After Task 37: we have a useful deterministic UI core for many tests.
- After Task 45: we have explicit capability boundaries.
- After Task 53: we have projection to a real DOM.
- After Task 58: we have the first real framework adapter.
- After Task 62: we have a usable control surface and CLI shell.

## Non-Goals for Early Tasks

Do not pull these into early milestones:

- Full browser DOM parity
- CSS layout emulation
- Canvas, media, or contenteditable
- Hydration
- Portals before the core tree and events are stable
- Multiple framework adapters before the React adapter contract is proven
- Remote daemon work before the in-process control API is solid

## Guiding Principle

Build the smallest deterministic runtime that can honestly say what it models, reject what it does not model, and prove every shipped behavior with tests before adding the next layer.
