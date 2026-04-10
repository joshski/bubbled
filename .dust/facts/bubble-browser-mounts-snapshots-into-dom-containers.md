# Bubble browser mounts snapshots into DOM containers

`createDomProjector({ bubble })` mounts the current bubble snapshot into a DOM container.
After mounting, committed bubble mutations update the projected DOM incrementally while preserving projected node identity across compatible moves and text updates.
`unmount()` removes only the nodes projected by that mount call, leaving pre-existing container content intact.
