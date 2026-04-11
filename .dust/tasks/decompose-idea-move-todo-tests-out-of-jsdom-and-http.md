# Decompose Idea: Move Todo Tests out of JSDOM and HTTP

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Move Todo Tests out of JSDOM and HTTP](../ideas/move-todo-tests-out-of-jsdom-and-http.md).

## Resolved Questions

### Should the global vitest environment change from `jsdom` to `node`?

**Decision:** Option: Change globally to `node`, annotate files that need JSDOM

### Does `bubble-browser/index.test.ts` actually need real JSDOM?

**Decision:** Option: Audit and move to `node` environment

### Should HTTP route tests be split from unit tests?

**Decision:** Option: Remove the redundant HTTP tests, keep only the bundled-asset test

### Should the `onChange` event adapter be extracted from JSX?

**Decision:** Option: Extract to a pure function in `todo-react.ts` or `todo-store.ts`


## Decomposes Idea

- [Move Todo Tests out of JSDOM and HTTP](../ideas/move-todo-tests-out-of-jsdom-and-http.md)


## Task Type

decompose

## Blocked By

(none)


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/move-todo-tests-out-of-jsdom-and-http.md) is deleted or updated to reflect remaining scope
