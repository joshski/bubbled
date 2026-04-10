# Bubble React renders simple host trees into the bubble

`createBubbleReactRoot({ bubble })` renders simple React host trees into `bubble-core`.
This slice reuses compatible host nodes across renders and maps React prop and text updates onto bubble attribute, property, and text mutations.
It still supports plain host elements and text nodes only, and it fails loudly if asked to render unsupported React component types.
