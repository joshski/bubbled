---
name: Simplify todo ID generation
description: Replace the regex-based createNextTodoId with t${todos.length + 1}
type: task
---

# Simplify todo ID generation

Replace `createNextTodoId` in `examples/todo-app/todo-store.ts` with the simpler expression `t${todos.length + 1}`. Update the test in `todo-store.test.ts` that asserts the assigned ID.

## Implementation

In `examples/todo-app/todo-store.ts`, replace the `createNextTodoId` function (which uses a regex to find the max numeric suffix) with a one-liner that returns `` `t${todos.length + 1}` ``.

In `examples/todo-app/todo-store.test.ts`, the test `'toggle, remove, and add persist the next state and notify subscribers'` starts with 2 initial todos (`a` and `b`), removes `b`, then adds a new item. After the removal there is 1 todo, so `todos.length + 1 = 2` and the new ID will be `t2`. Update the assertion from `t1` to `t2`.

## Task Type

implement

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](./../principles/build-thin-tested-slices.md)

## Guidance

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

### Comprehensive Test Coverage

A project's test suite is its primary safety net, and agents depend on it even more than humans do.

Agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness. Gaps in test coverage become gaps in agent capability — areas where changes are risky and feedback is absent. Comprehensive coverage means every meaningful behaviour is tested, so agents can make changes anywhere in the codebase with confidence.

## Definition of Done

- `createNextTodoId` is replaced with `` `t${todos.length + 1}` `` (the function can be inlined or replaced inline in `appendTodo`)
- The test that previously expected `t1` is updated to expect `t2`
- `bunx dust check` passes
