# Bubble browser can measure projected DOM layout

`bubble-browser` exposes `createDomLayout({ projector })` for projected element geometry.

`placePopover()` and `measureAndPlacePopover()` keep placement logic pure while a real browser verifies final layout-dependent integration.
