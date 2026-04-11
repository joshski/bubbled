# Decompose Idea: Split Bubble React Root Planning and Reconciliation

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Split Bubble React Root Planning and Reconciliation](../ideas/split-bubble-react-root-planning-and-reconciliation.md).

## Resolved Questions

### Should unsupported React features stay enforced inside the planner, or move into a separate hook/runtime boundary?

**Decision:** Keep feature enforcement in the planner

### Should the first split prioritize child reconciliation or component execution?

**Decision:** Extract child reconciliation first


## Decomposes Idea

- [Split Bubble React Root Planning and Reconciliation](../ideas/split-bubble-react-root-planning-and-reconciliation.md)


## Task Type

decompose

## Blocked By

(none)


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/split-bubble-react-root-planning-and-reconciliation.md) is deleted or updated to reflect remaining scope
