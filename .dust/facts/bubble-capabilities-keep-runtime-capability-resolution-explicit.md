# Bubble capabilities keep runtime capability resolution explicit

`bubble-capabilities` limits itself to capability contracts plus `createCapabilityRegistry()`.
Its colocated tests cover successful resolution and the named unsupported-capability error, so the slice stays narrow and deterministic.
