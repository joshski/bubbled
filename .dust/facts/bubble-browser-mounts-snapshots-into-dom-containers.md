# Bubble browser mounts snapshots into DOM containers

`createDomProjector({ bubble })` mounts the current bubble snapshot into a DOM container.
After mounting, committed bubble mutations update the projected DOM incrementally while preserving projected node identity across compatible moves and text updates.
With `bridgeEvents: true`, projected DOM click events are translated back into bubble click dispatch using the projected node mapping, and unmapped DOM targets are ignored safely.
`unmount()` removes only the nodes projected by that mount call, leaving pre-existing container content intact.
