# Runtime exposes deterministic viewport

`createBubble()` exposes `getViewportState()`.
It reads from an explicit viewport capability, defaults to a deterministic viewport model, and forwards viewport subscriptions when the injected capability supports them.
