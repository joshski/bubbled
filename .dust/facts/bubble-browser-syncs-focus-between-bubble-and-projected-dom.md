# Bubble browser syncs focus between bubble and projected DOM

`createDomProjector({ bubble, syncFocus: true })` keeps projected DOM focus aligned with bubble focus.
Bubble `focus()` and `blur()` updates move projected DOM focus, and projected DOM `focus` events move bubble focus back to the mapped bubble node when that node is projected.
