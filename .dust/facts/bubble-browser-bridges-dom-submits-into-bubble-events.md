# Bubble browser bridges DOM submits into bubble events

`createDomProjector({ bubble, bridgeEvents: true })` listens for projected DOM `submit` events.
It dispatches bubble `submit` events for the projected form target and prevents native browser navigation after bridging that submit into the bubble runtime.
The colocated fake-DOM tests cover the deterministic bridge slice, and `bubble-browser/browser-verification.test.ts` also verifies in a real browser that a default submit button produces a prevented native `submit` event and the bridged bubble form payload.
