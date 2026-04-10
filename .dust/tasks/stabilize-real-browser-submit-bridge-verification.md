# Stabilize Real Browser Submit Bridge Verification

Stabilize the real-browser verification for bridged default form submission in `bubble-browser`.
The UI adapter review found that the fake-DOM submit tests pass, but the browser-facing verification currently times out in this environment. That makes the browser-facing slice less traceable than the neighboring layout and focus verifications.

## Task Type

refine

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units (core principle)
- Task-First Workflow (core principle)

## Facts

- [Bubble browser bridges DOM submits into bubble events](../facts/bubble-browser-bridges-dom-submits-into-bubble-events.md)

## Definition of Done

- `bubble-browser/browser-verification.test.ts` verifies bridged default form submission in a real browser without timing out under the normal Bun test run
- The browser verification isolates the observable browser behavior it depends on so failures point to submit bridging rather than unrelated setup details
- Colocated fake-DOM submit-bridge tests continue to cover the deterministic runtime slice alongside the real-browser verification
