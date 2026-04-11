# Remove Redundant HTTP Route Tests

Delete the route-correctness tests from `server.test.ts` that duplicate direct function test coverage. Keep only the bundled-asset test.

## Background

`server.test.ts` contains a `todo app Bun routes` describe block that starts a real `Bun.serve()` instance and makes HTTP requests against it. Most of what it tests — status codes, JSON shape, method handling — is already covered by the direct function tests in the same file (`createTodoApiResponse`, `handleTodoFallbackRequest`, `createTodoRoutes`).

Only the test `serves the bundled client asset referenced by the HTML page` exercises something that genuinely requires a running server and a built artifact. The rest can be deleted without any loss of coverage.

## Task Type

implementation

## Blocked By

(none)

## Principles

- [Build Thin Tested Slices](../principles/build-thin-tested-slices.md)

## Guidance

### Keep Unit Tests Pure

Unit tests (those run very frequently as part of a tight feedback loop) should be pure and side-effect free. A test is **not** a unit test if it:

- Accesses a database
- Communicates over a network
- Touches the file system
- Cannot run concurrently with other tests
- Requires special environment setup

"Unit tests" here means tests run frequently during development — not system tests, which intentionally exercise the full stack including I/O. Pure unit tests exercise only business logic, not infrastructure.

The value of pure unit tests is that they are fast, deterministic, and isolate business logic from infrastructure concerns. When unit tests pass but integration or system tests fail, developers can immediately narrow the problem to the boundary layer — a diagnostic "binary chop" that accelerates debugging.

Where existing tests are impure, prefer converting them to use in-memory alternatives — stubs, fakes, or dependency-injected doubles — rather than leaving them as-is.

### Fast Feedback Loops

The primary feedback loop — write code, run checks, see results — should be as fast as possible.

Fast feedback is the foundation of productive development, for both humans and agents. When tests, linters, and type checks run in seconds rather than minutes, developers iterate more frequently and catch problems earlier. Agents especially benefit because they operate in tight loops of change-and-verify; slow feedback wastes tokens and context window space on waiting rather than working.

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Definition of Done

- The route-correctness HTTP tests in the `todo app Bun routes` describe block are deleted (`GET /`, `GET /api/todos`, `POST /api/todos`, `404` HTTP-level variants)
- The `serves the bundled client asset referenced by the HTML page` test is retained
- All tests pass
