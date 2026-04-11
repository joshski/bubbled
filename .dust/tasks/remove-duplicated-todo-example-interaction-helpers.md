# Remove duplicated todo example interaction helpers

Replace the todo example test's local interaction helper functions with the shared role-based helpers from bubble-test.

## Task Type

implement

## Blocked By

(none)


## Definition of Done

- examples/todo-app/react/mountTodoApp.test.ts no longer defines local click/change helper wrappers that duplicate bubble-test role-based interactions
- The todo example test uses shared bubble-test role-based interaction helpers for the existing button and textbox flows
- The updated test suite passes without changing the todo app's user-visible behavior
