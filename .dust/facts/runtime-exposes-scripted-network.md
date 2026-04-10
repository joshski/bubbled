# Runtime exposes scripted network

`createBubble()` exposes `fetch()`.
It forwards requests to an injected `network` capability and fails loudly when network behavior has not been scripted.
