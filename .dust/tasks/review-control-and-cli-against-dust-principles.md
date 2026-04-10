# Review Control And CLI Against Dust Principles

Review the control surface packages against the selected dust principles: `bubble-control` and `bubble-cli`. Focus on the observable session lifecycle, query and command flow, error handling, and the way the CLI exposes the control API, then capture any needed improvements as follow-up ideas or tasks.

## Task Type

capture

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)
- Small Units (core principle)
- Task-First Workflow (core principle)
- Traceable Decisions (core principle)

## Facts

- [Control sessions publish runtime and error streams](../facts/control-sessions-publish-runtime-and-error-streams.md)
- [Bubble CLI invokes the control API for one-shot commands](../facts/bubble-cli-invokes-the-control-api-for-one-shot-commands.md)

## Guidance

### Build Thin Tested Slices

# Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Parent Principle

(none)

## Sub-Principles

(none)

### Small Units

# Small Units

Ideas, principles, facts, and tasks should each be as discrete and fine-grained as possible.

Small, focused documents enable precise relationships between them. A task can link to exactly the principles it serves. A fact can describe one specific aspect of the system. This granularity reduces ambiguity.

Tasks especially benefit from being small. A narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit.

Note: This principle directly supports Lightweight Planning, which explicitly mentions that "Tasks are small and completable in single commits."

## Parent Principle

- Agent Autonomy

## Sub-Principles

- (none)

### Task-First Workflow

# Task-First Workflow

Work should be captured as a task before implementation begins, creating traceability between intent and outcome.

This discipline ensures that every change has a documented purpose. The commit history shows pairs of "Add task" followed by implementation, making it easy to understand why each change was made. It also prevents scope creep by defining boundaries before work starts.

## Parent Principle

- Lightweight Planning

## Sub-Principles

- (none)

### Traceable Decisions

# Traceable Decisions

The commit history should explain why changes were made, not just what changed.

Commit messages should capture intent and context that would otherwise be lost. Future maintainers (human or AI) will traverse history to understand the reasoning behind decisions. A commit that says "Fix bug" is less valuable than one that explains what was broken and why the fix is correct.

## Parent Principle

- Atomic Commits

## Sub-Principles

- (none)

## Definition of Done

- `bubble-control` and `bubble-cli` are reviewed against the selected principles with their tests
- Any improvements surfaced by the review are captured as new, narrowly scoped `.dust/ideas/` or `.dust/tasks/` artifacts before code changes begin
- If the reviewed control surface needs no follow-up, the completion of this task records that conclusion explicitly
