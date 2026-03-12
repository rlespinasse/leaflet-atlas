# API reference

## MapApp

The main class. Import and instantiate with a
configuration object.

```js
import { MapApp } from 'leaflet-atlas';
const app = new MapApp(config);
```

### Methods

#### getMap()

Returns the underlying `L.Map` instance.

#### showDetail(html)

Opens the detail panel with the given HTML content.
Pushes the current content to the back stack.

#### hideDetail()

Closes the detail panel and clears navigation history.

#### showFeatureDetail(layerId, featureIndex, properties?)

Opens the detail panel for a specific feature using
the registered detail builder for that layer. If
`properties` is omitted, they are looked up from
the layer.

#### getDetailBuilder(layerId)

Returns the detail builder function for a layer, or
`undefined`.

#### findLayerByProperty(layerId, matchFn)

Returns the first Leaflet layer in the given layer
where `matchFn(properties, layer)` returns `true`,
or `null`.

**Parameters:**

- `layerId` (string) — layer id
- `matchFn` (function) — `(properties, layer) => boolean`

#### findLayerByIndex(layerId, index)

Returns the Leaflet layer at the given feature index
within a layer, or `null`.

#### findFeatureIndex(layerId, targetLayer)

Returns the integer index of a Leaflet layer within
its parent layer group, or `-1`.

#### eachLayerFeature(layerId, callback)

Iterates all Leaflet layers (features) in a layer,
calling `callback(layer)` for each.

#### highlightFeature(layer, layerId, opts?)

Temporarily highlights a Leaflet layer.

**Options:**

| Property       | Type    | Default           |
| -------------- | ------- | ----------------- |
| `style`        | object  | red highlight     |
| `duration`     | number  | `2500` (ms)       |
| `bringToFront` | boolean | `false`           |

Default style:
`{ weight: 4, fillOpacity: 0.5, color: '#e57373' }`

#### ensureLayerVisible(layerId)

If the layer is not on the map, adds it and syncs the
drawer toggle.

#### fitBounds()

Fits the map to the bounds layer (`boundsLayerId`), or
falls back to the configured center/zoom.

#### updateHash()

Serializes the current map state (layers, view, base
layer, selection) to the URL hash.

#### getLayersDrawer()

Returns the layers drawer control instance.

#### getAllLayerDefs()

Returns the array of all layer definitions (layer
groups + context layers).

---

## Exported utilities

### HTML builders

#### buildDetail(title, layerId, groups, styles, allLayerDefs)

Builds the standard detail panel HTML.

- `title` (string) — feature title
- `layerId` (string) — layer id for the color badge
- `groups` (array) — `[{ label, rows }]`
- `styles` (object) — styles config
- `allLayerDefs` (array) — all layer definitions

> **Note:** In detail builders, use
> `helpers.buildDetail(title, layerId, groups)` instead —
> `styles` and `allLayerDefs` are pre-bound.

#### buildReverseLinksSection(data, sectionLabel, allLayerDefs)

Builds a group object for reverse links. Returns
`{ label, rows }` or `null`.

#### sourceRow(source)

Returns a row tuple `['Sources', <link HTML>]` for a
`{ name, url }` source.

### Link helpers

#### crossLink(type, value, displayText, extraAttrs?)

Returns an HTML string for a cross-link anchor. Returns
empty string if `value` is falsy or `'None'`.

#### featureLink(layerId, featureIndex, displayText)

Returns an HTML string for a feature-to-feature link.

### Text utilities

#### normalizeText(str)

Strips diacritics and lowercases the string.

#### escapeHtml(str)

HTML-escapes `&`, `<`, `>`.

#### rawHtml(str)

Wraps a string as `{ __html: str }` for use in detail
panel rows.

#### renderValue(val)

If `val` is a `{ __html }` object, returns the raw HTML.
Otherwise HTML-escapes it.

#### joinNotNull(arr)

Joins non-null, non-`'None'` values with `', '`.

### Style helpers

#### setToggleState(btn, active, scope, partial?, labels?)

Sets the visual and ARIA state of a toggle button
element.

#### getHoverStyle(layerId, styles)

Returns the computed hover style for a layer.

#### highlightFeature(layer, layerId, styles, opts?)

Standalone version of `MapApp.highlightFeature`.

### Analytics

#### createAnalytics(config)

Returns an analytics object with
`trackEvent(path, title)` and `trackPageView()` methods.

#### isLocalhost()

Returns `true` if the page is running on
localhost/127.0.0.1/0.0.0.0.

### Patterns

#### buildPatternContent(parent, cfg, color)

Appends SVG elements to a pattern element based on the
pattern config.

#### createPatternDefs(styles, patterns)

Creates an SVG `<defs>` element containing all pattern
definitions.

#### injectPatterns(styles, patterns)

Injects pattern defs into all Leaflet overlay SVGs that
don't already have them.

#### injectPatternCSS(patterns)

Injects a `<style>` element with CSS rules mapping layer
classes to their pattern fills.
