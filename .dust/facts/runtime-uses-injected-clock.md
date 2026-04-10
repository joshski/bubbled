# Runtime uses injected clock

`createBubble()` exposes `now()` and reads time from the injected `clock` capability rather than ambient `Date.now()`.
