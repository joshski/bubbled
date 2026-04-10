# Bubble browser verifies native label focus in a real browser

`bubble-browser` has a real browser verification for native label focus transfer.
With `createDomProjector({ bubble, syncFocus: true })`, that native browser focus transfer also updates bubble focus to the projected input node.
