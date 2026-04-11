# Switch Vitest to Node Environment

Switch `vitest.config.ts` from `environment: 'jsdom'` to `environment: 'node'`. Add per-file `@vitest-environment jsdom` directives to `bubble-browser/index.test.ts` (after auditing whether it actually needs JSDOM) and the `defaultGlobalsTest` in `todo-app.test.tsx`. Confirm all tests pass after the change.

## Background

`vitest.config.ts` currently sets `environment: 'jsdom'` globally, so every test — including pure in-memory logic tests — runs inside a simulated browser. The framework exists to prevent exactly this. Most tests should run in a bare Node/Bun environment.

`bubble-browser/index.test.ts` defines its own `FakeDomNode`, `FakeDomElement`, and `FakeDomText` stubs throughout. It may not need real JSDOM at all — audit by switching it to `node` and observing failures.

`todo-app.test.tsx` has a single test (`defaultGlobalsTest`) that calls `document.createElement` and `document.body.appendChild`. It is already guarded with a skip when `document` is undefined. This test needs the `@vitest-environment jsdom` annotation.

## Principles

- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)
- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Design for Testability](../principles/design-for-testability.md)
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

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Build Thin Tested Slices

Build the runtime one observable behavior at a time with tests in the same change.

Keep each task narrowly scoped, use deterministic semantics, reject unsupported behavior explicitly, and preserve full coverage while the repo is still small.

## Definition of Done

- `vitest.config.ts` sets `environment: 'node'`
- `bubble-browser/index.test.ts` either has `@vitest-environment jsdom` (if it truly needs JSDOM) or runs cleanly in `node` without the annotation
- `todo-app.test.tsx` has `@vitest-environment jsdom` covering the `defaultGlobalsTest`
- All tests pass
