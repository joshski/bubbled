# Review Browser And React Against Dust Principles

Review the UI-facing runtime adapters against the selected dust principles: `bubble-browser` and `bubble-react`. Focus on the observable behaviors already expressed through projection, event bridging, focus sync, layout measurement, and React host rendering, and create follow-up ideas or tasks for any review findings.

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

- [Bubble browser mounts snapshots into DOM containers](../facts/bubble-browser-mounts-snapshots-into-dom-containers.md)
- [Bubble browser bridges DOM clicks into bubble events](../facts/bubble-browser-bridges-dom-clicks-into-bubble-events.md)
- [Bubble browser bridges DOM submits into bubble events](../facts/bubble-browser-bridges-dom-submits-into-bubble-events.md)
- [Bubble browser syncs focus between bubble and projected DOM](../facts/bubble-browser-syncs-focus-between-bubble-and-projected-dom.md)
- [Bubble browser can measure projected DOM layout](../facts/bubble-browser-can-measure-projected-dom-layout.md)
- [Bubble browser verifies native label focus in a real browser](../facts/bubble-browser-verifies-native-label-focus-in-a-real-browser.md)
- [Bubble React renders simple host trees into the bubble](../facts/bubble-react-renders-simple-host-trees-into-the-bubble.md)

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

- `bubble-browser` and `bubble-react` are reviewed against the selected principles with their tests, including the real-browser verification where relevant
- Any improvements surfaced by the review are captured as new, narrowly scoped `.dust/ideas/` or `.dust/tasks/` artifacts before code changes begin
- If the reviewed UI surface needs no follow-up, the completion of this task records that conclusion explicitly
