# Bubble browser bridges DOM submits into bubble events

`createDomProjector({ bubble, bridgeEvents: true })` listens for projected DOM `submit` events.
It dispatches bubble `submit` events for the projected form target and prevents native browser navigation after bridging that submit into the bubble runtime.
