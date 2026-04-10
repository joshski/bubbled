# Bubble browser bridges DOM clicks into bubble events

`createDomProjector({ bubble, bridgeEvents: true })` listens for projected DOM `click` events.
It dispatches them back through `bubble.dispatchEvent()`.
The bridge preserves the mapped bubble target for the projected DOM node and ignores unknown or null DOM targets without throwing.
