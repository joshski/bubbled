# Bubble React renders simple host trees into the bubble

`createBubbleReactRoot({ bubble })` renders simple React host trees into `bubble-core`.
This initial slice supports plain host elements and text nodes only, and it fails loudly if asked to render unsupported React component types.
