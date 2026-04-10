# Close CLI One-Shot Control Sessions

`bubble-cli` creates a control session for each one-shot command or query, but it does not currently close that session after the operation completes. The control review found that this keeps the CLI thin from an API-mapping perspective, yet leaves the observable session lifecycle incomplete for a one-shot shell.

## Task Type

refine

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units (core principle)
- Task-First Workflow (core principle)

## Facts

- [Bubble CLI invokes the control API for one-shot commands](../facts/bubble-cli-invokes-the-control-api-for-one-shot-commands.md)
- [Control sessions publish runtime and error streams](../facts/control-sessions-publish-runtime-and-error-streams.md)

## Definition of Done

- `bubble-cli` closes the created control session after a one-shot command or query finishes, including failure paths
- Colocated `bubble-cli` tests cover the cleanup behavior without weakening the current command, query, and error-flow assertions
- The CLI keeps the observable command/query result and exit-code behavior unchanged while making session cleanup explicit
