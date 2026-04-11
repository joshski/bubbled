# Decompose Idea: Simplify Todo Example for Ergonomics

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Simplify Todo Example for Ergonomics](../ideas/simplify-todo-example-for-ergonomics.md).

## Resolved Questions

### Should the example keep loading todos through `/api/todos`, or inline the initial data into the HTML bootstrap path?

**Decision:** Keep `/api/todos`

### Should the example keep `createTodoStore({ storage })` explicit in the browser shell, or hide persistence inside a higher-level example helper?

**Decision:** Keep the store seam explicit


## Decomposes Idea

- [Simplify Todo Example for Ergonomics](../ideas/simplify-todo-example-for-ergonomics.md)


## Task Type

decompose

## Blocked By

(none)


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/simplify-todo-example-for-ergonomics.md) is deleted or updated to reflect remaining scope
