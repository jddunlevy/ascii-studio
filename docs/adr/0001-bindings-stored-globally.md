# Bindings stored globally, not on elements

Bindings live in a flat top-level array in the composition, each referencing an element by ID — not nested inside the element they target. This is the right foundation for a future node graph where connections aren't necessarily 1:1 with a single element, and it keeps all mappings visible at once in the binding panel without requiring an element to be selected first. The cost is a join step when rendering (look up element by ID), but that's trivial.

## Considered options

- **Bindings on the element** — simpler data model, no join needed. Rejected because it couples the binding to the element's lifecycle, makes the global binding panel awkward to implement, and would require a migration when a node graph is added.
- **Global bindings array (chosen)** — slightly more complex store queries, but matches the node graph mental model and enables the panel to show all wiring at once.
