# Architecture

## Config-driven design

leaflet-atlas follows a declarative, config-driven
approach. Instead of imperatively creating Leaflet layers,
controls, and event handlers, you pass a single
configuration object to `MapApp` and the framework wires
everything together.

This design has two goals:

1. **Reduce boilerplate** — a typical interactive GeoJSON
   map needs layer management, search, detail panels, URL
   state, and keyboard shortcuts. These are common across
   projects but tedious to implement from scratch.
1. **Keep the consumer code focused on data** — the config
   describes *what* to show (layers, styles, labels,
   builders), not *how* to show it. The framework handles
   the DOM, events, and Leaflet integration.

## Module overview

```text
src/js/
  index.js          Public API surface (re-exports)
  map-app.js        MapApp — main orchestrator
  controls.js       Leaflet controls
  detail-panel.js   Detail panel DOM + HTML builders
  helpers.js        Pure utility functions
  hash-state.js     URL hash serialization
  analytics.js      Pluggable analytics abstraction
  patterns.js       SVG pattern engine

src/css/
  index.css         CSS entry point (imports all)
  style.css         Base map and layout styles
  layers.css        Layers drawer
  controls.css      Bottom bar, zoom, buttons
  search.css        Search input and results
  detail.css        Detail panel
  title.css         Title overlay
  loading.css       Loading spinner overlay
  legal-overlay.css Legal pages overlay
  responsive.css    Mobile breakpoints
```

## MapApp lifecycle

When you instantiate `new MapApp(config)`, the constructor
runs a synchronous initialization sequence followed by
asynchronous data loading.

### Synchronous init

1. **State setup** — stores config, builds the list of all
   layer definitions (layer groups + context layers), and
   initializes internal state.
1. **DOM setup** — creates the Leaflet map, base layers,
   title overlay, detail panel, custom panes, and loading
   overlay.
1. **Behavior setup** — parses the URL hash for initial
   state, initializes detail builders (needed before
   controls), creates all controls (layers drawer, search,
   bottom bar), builds keyboard shortcuts, and creates
   help/legal overlays.

### Asynchronous loading

1. **Data loading** — fetches all GeoJSON files in
   parallel. As each loads, its Leaflet layer is created,
   styled, and added to the map. Border click layers and
   the mask layer are created as needed.
1. **Post-load** — once all layers have loaded: updates
   feature counts in the drawer, builds the search index,
   injects SVG patterns, applies the initial URL hash
   state (layers, view, selection), tracks the initial
   page view, starts listening for map moves to update the
   hash, and fades out the loading overlay.
1. **onReady** — calls the consumer's `onReady` callback
   with the `MapApp` instance.

## Layers drawer

The layers drawer is a Leaflet control that renders as an
`<aside>` appended to the `<main>` element (not to the map
container). This lets it sit alongside the map rather than
floating on top.

Layers are grouped into collapsible sections. Each section
has a group toggle that activates/deactivates all layers
in the group. Individual layer rows show a color swatch
(with pattern support), a label, a feature count, and a
toggle button.

Base layers are shown in a separate tab as thumbnail
cards.

## Detail panel

The detail panel is an `<aside>` with:

- **Navigation history** — back/forward buttons backed by
  two stacks. Each entry stores the HTML content and the
  selected feature info.
- **Cross-link handling** — click events on `.cross-link`
  elements are intercepted. Built-in `feature` type links
  zoom to and select the target feature. Custom types are
  dispatched to consumer-provided handlers.
- **Resize handle** — drag the left edge to resize the
  panel (desktop only).

## URL hash state

The URL hash encodes the current map state as query
parameters:

- `layers` — comma-separated list of active layer ids
  (omitted if default)
- `base` — active base layer name (omitted if default)
- `lat`, `lng`, `z` — map center and zoom
- `sel` — selected feature as `layerId,featureIndex`

The hash is updated on map move, layer toggle, feature
selection, and panel navigation. On page load, the hash is
parsed and applied after all layers finish loading.

## SVG patterns

Patterns are injected into the Leaflet overlay SVG's
`<defs>`. A corresponding CSS rule sets
`fill: url(#pattern-<layerId>)` on the layer's path
elements. Patterns are re-injected on `layeradd` events
to handle layers being toggled.

## Analytics

The analytics module is a thin abstraction. It receives a
provider name and config, and returns an object with
`trackEvent(path, title)` and `trackPageView()`.
GoatCounter is the only built-in provider. Analytics calls
are no-ops on localhost.
