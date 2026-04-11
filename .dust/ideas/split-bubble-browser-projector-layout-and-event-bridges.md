# Split Bubble Browser Projector, Layout, and Event Bridges

`bubble-browser/index.ts` is currently 592 lines. It packs together popover placement helpers, DOM layout measurement, DOM projection, focus synchronization, mutation application, and native-to-bubble event bridging in one entrypoint.

## Why This Matters

`bubble-browser` sits at the browser boundary, so changes here often involve subtle interactions between DOM projection, runtime subscriptions, and native events. Keeping all of that in one file makes it harder to isolate bugs and harder to extend one concern without reloading the rest.

## Current Context

- `placePopover()` and `measureAndPlacePopover()` are standalone layout helpers that do not depend on DOM projection internals.
- `createDomLayout()` exposes measurement by reading the projected element lookup maintained by the DOM projector.
- `createDomProjector()` owns node creation, lookup maps, mutation application, focus sync, mount/unmount lifecycle, and event bridge registration.
- The projector currently bridges `click`, `input`/change-style updates, and `submit`, while also maintaining the DOM-backed lookup that layout measurement depends on.

## Friction Observed

- Layout helpers and the DOM projector share a file despite being conceptually separable.
- The projector lifecycle and the native event bridges are interleaved, which makes event changes higher-risk than they need to be.
- Focus sync introduces another state machine inside `createDomProjector()`, but it is not isolated from generic projection logic.
- The lookup state used for DOM-backed layout measurement is coupled directly to the projector implementation rather than to a dedicated projection state boundary.

## Idea

Split the browser package into smaller modules organized around browser concerns instead of one monolithic entrypoint.

Possible extraction seams:

- Move popover placement and measurement helpers into a layout module.
- Extract projector state and mutation application into projection-focused modules.
- Extract native event bridge registration into a dedicated bridge module that translates DOM events into bubble dispatches.
- Extract focus synchronization into a small module that owns the DOM-to-bubble and bubble-to-DOM feedback guards.
- Keep `createDomProjector()` as the public composition point that wires these pieces together.

## Expected Outcome

- Browser-boundary bugs can be debugged within smaller, purpose-built modules.
- Layout helpers can evolve without touching projection internals.
- Event bridge behavior becomes easier to test independently from DOM tree projection.
- Focus synchronization rules become explicit rather than implicit closure state inside the main projector.

## Open Questions

### Should DOM-backed layout remain coupled to `BubbleDomProjector`, or should it become a first-class projection-state abstraction?

#### Keep layout tied to the projector API

Continue exposing layout measurement as something created from a projector instance. This minimizes API churn, but it keeps the projected-element lookup as projector-owned state.

#### Introduce a reusable projection state object

Extract projection state so both the projector and layout adapter depend on the same internal abstraction. This would better reflect the current hidden coupling, but it adds another internal concept to the package.
