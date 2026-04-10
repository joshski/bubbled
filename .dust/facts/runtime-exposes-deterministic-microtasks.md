# Runtime exposes deterministic microtasks

`createBubble()` exposes `queueMicrotask()`.
It delegates to the injected `scheduler` capability, so deferred work ordering and flushing stay deterministic in tests.
