# Bubble browser mounts snapshots into DOM containers

`createDomProjector({ bubble })` mounts the current bubble snapshot into a DOM container.
`unmount()` removes only the nodes projected by that mount call, leaving pre-existing container content intact.
