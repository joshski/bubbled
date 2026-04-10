# Remove Destroyed Control Sessions From Controller Registry

`bubble-control` sessions currently stay discoverable after destruction. `controller.getSession(id)` still returns the session after `session.destroy()` or `session.command({ type: "destroy" })` completes. The control review found that the runtime stream itself shuts down correctly, but the observable session lifecycle does not close cleanly at the controller boundary.

## Task Type

refine

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units (core principle)
- Task-First Workflow (core principle)

## Facts

- [Control sessions publish runtime and error streams](../facts/control-sessions-publish-runtime-and-error-streams.md)

## Definition of Done

- Destroying a control session removes it from the controller registry so `getSession(id)` returns `null`
- Colocated `bubble-control` tests cover the observable controller lifecycle before and after session destruction
- The controller continues to reject post-destruction commands and queries explicitly with the existing structured session error
