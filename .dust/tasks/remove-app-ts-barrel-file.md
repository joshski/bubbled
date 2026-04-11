---
name: Remove app.ts barrel file
description: Delete the unused app.ts re-export barrel in the todo example
type: task
---

# Remove app.ts barrel file

`examples/todo-app/app.ts` re-exports from `server.ts`, `todo-react.ts`, and `todo-browser.ts`, but nothing in the repository imports from it. It is dead code. Delete it.

## Implementation

Delete `examples/todo-app/app.ts`. No callers import from it, so no other files need updating.

## Task Type

implement

## Blocked By

(none)

## Principles

- Boy Scout Rule (core)
- Repository Hygiene (core)
- Atomic Commits (core)

## Guidance

### Boy Scout Rule

Always leave the code better than you found it.

When working in any area of the codebase, take the opportunity to make small improvements — clearer names, removed dead code, better structure — even if they're not directly related to the task at hand. These incremental improvements compound over time, preventing gradual decay and keeping the codebase healthy without requiring dedicated cleanup efforts.

The Boy Scout Rule is not a license for large-scale refactoring during unrelated work. Improvements should be small, obvious, and low-risk. If a cleanup is too large to include alongside the current task, capture it as a separate task instead.

### Repository Hygiene

Dust repositories should maintain a clean, organized state with minimal noise.

This includes proper gitignore configuration to exclude build artifacts, dependencies, editor files, and other generated content from version control. A well-maintained repository makes it easier for both humans and AI to navigate and understand the codebase.

### Atomic Commits

Each commit should tell a complete story, bundling implementation changes with their corresponding documentation updates.

When a task is completed, the commit deletes the task file, updates relevant facts to reflect the new reality, and removes any ideas that have been realized. This discipline ensures that any point in the commit history represents a coherent, self-documenting state of the project.

Clean commit history is essential because archaeology depends on it. Future humans and AI agents will traverse history to understand why decisions were made and how the system evolved.

## Definition of Done

- `examples/todo-app/app.ts` is deleted
- `bunx dust check` passes
