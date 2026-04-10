# Runtime exposes deterministic timers

`createBubble()` exposes `setTimeout()` and `clearTimeout()`.
It delegates them to the injected `timers` capability, so timeout behavior follows the injected clock model used by tests.
