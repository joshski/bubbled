# Bubble React renders simple host trees into the bubble

`createBubbleReactRoot({ bubble })` renders simple React host trees into `bubble-core`.
This slice reuses compatible host nodes across renders and maps React prop and text updates onto bubble attribute, property, and text mutations.
Explicitly keyed child reorders reuse existing bubble nodes and emit bubble move operations instead of replacing those nodes.
Bubble `click` dispatches can also trigger React `onClick` handlers, and handler removal or replacement is reconciled across renders.
It still supports plain host elements and text nodes only, and it fails loudly if asked to render unsupported React component types.
