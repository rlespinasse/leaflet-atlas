# Configuration reference

The `MapApp` constructor accepts a single configuration
object. All properties are optional unless noted.

## map

Map initialization options.

| Property    | Type     | Default  | Description       |
| ----------- | -------- | -------- | ----------------- |
| `elementId` | string   | `'map'`  | Container element |
| `center`    | number[] | `[0, 0]` | `[lat, lng]`      |
| `zoom`      | number   | `2`      | Initial zoom      |
| `zoomSnap`  | number   | `0.5`    | Zoom snap         |

## baseLayers

Object mapping base layer names to tile layer definitions.

```js
baseLayers: {
  'Layer Name': {
    url: 'https://tile.example.com/{z}/{x}/{y}.png',
    options: {
      attribution: '...',
      maxZoom: 19,
    },
    thumbnailUrl: 'thumb.png', // optional
  },
}
```

## defaultBaseLayer

`string` — Name of the base layer to show by default.
Defaults to the first key in `baseLayers`.

## layerGroups

**Required.** Array of layer group definitions.

```js
layerGroups: [
  {
    group: string,   // Group display name
    layers: [
      {
        id: string,      // Unique identifier
        label: string,   // Display name
        file: string,    // GeoJSON path or URL
        active: boolean, // Default: true
      },
    ],
  },
]
```

## contextLayers

Array of layer definitions (same shape as
`layerGroups[].layers`). Shown in a separate section at
the top of the layers drawer. Context layers do not bring
to front on hover.

## styles

Object mapping layer ids to
[Leaflet path options][path].

[path]: https://leafletjs.com/reference.html#path-option

```js
styles: {
  layerId: {
    color: string,
    fillColor: string,
    fillOpacity: number,
    weight: number,
    dashArray: string,
    radius: number, // renders CircleMarkers
  },
}
```

## geometryTypes

Object mapping layer ids to geometry type overrides.

```js
geometryTypes: {
  layerId: 'point' | 'line' | 'polygon',
}
```

Used for legend swatch rendering. Inferred from style if
not set (`radius` -> `'point'`, otherwise `'polygon'`).

## patterns

Object mapping layer ids to SVG pattern configurations.

```js
patterns: {
  layerId: {
    type: 'diagonal' | 'crosshatch' | 'dots'
      | 'stipple' | 'circles' | 'horizontal',
    size: number,
    strokeWidth: number,
    radius: number,
  },
}
```

## panes

Object mapping pane names to options.

```js
panes: {
  paneName: {
    zIndex: number,
    pointerEvents: string, // e.g. 'none'
  },
}
```

## layerPanes

Object mapping layer ids to pane names.

```js
layerPanes: {
  layerId: 'paneName',
}
```

## borderClickLayers

Object mapping layer ids to pane names. Creates an
invisible wide-stroke layer for border-only click
interactions.

```js
borderClickLayers: {
  layerId: 'clickPaneName',
}
```

## maskLayer

Configuration for the mask (dim outside a boundary).

| Property        | Type   | Default  | Description    |
| --------------- | ------ | -------- | -------------- |
| `sourceLayerId` | string | —        | Boundary layer |
| `fillColor`     | string | `'#000'` | Mask color     |
| `fillOpacity`   | number | `0.3`    | Mask opacity   |

## boundsLayerId

`string` — Layer id used to compute the initial map
extent via `fitBounds`.

## boundsFallback

Fallback view when `boundsLayerId` is unavailable.

```js
boundsFallback: {
  center: [lat, lng],
  zoom: number,
}
```

## searchableProps

Object mapping layer ids to search configurations.

```js
searchableProps: {
  layerId: {
    title: (props) => string,
    meta: (props) => string,
    text: string[],
  },
}
```

## tooltips

Object mapping layer ids to tooltip functions.

```js
tooltips: {
  layerId: (props) => string | null,
}
```

## detailBuilders

Function that receives a helpers object and returns an
object mapping layer ids to detail builder functions.

```js
detailBuilders: (helpers) => ({
  layerId: (props) => string, // returns HTML
}),
```

See [Configure detail panels](../how-to/configure-detail-panels.md)
for the full helpers API.

## crossLinkHandlers

Object mapping custom cross-link types to handler
functions.

```js
crossLinkHandlers: {
  typeName: (app, value, linkElement) => void,
}
```

## reverseLinksUrl

`string` — URL to a JSON file containing reverse link
data.

## title

Title overlay configuration.

| Property   | Type   | Description  |
| ---------- | ------ | ------------ |
| `heading`  | string | Main title   |
| `subtitle` | string | Subtitle     |
| `icon`     | string | Icon URL     |

## labels

Object overriding UI strings. See
[Customize controls](../how-to/customize-controls.md)
for the full list of keys.

## shortcuts

Array overriding the default keyboard shortcuts. See
[Customize controls](../how-to/customize-controls.md)
for the shortcut object shape.

## analytics

Analytics configuration.

| Property   | Type   | Description      |
| ---------- | ------ | ---------------- |
| `provider` | string | e.g. goatcounter |
| `basePath` | string | Event prefix     |

## legalPages

Array of tabbed legal page definitions.

```js
legalPages: [
  {
    id: string,      // unique tab identifier
    label: string,   // tab button text
    content: string, // HTML content
  },
]
```

## onReady

`(app: MapApp, info: { failedLayers: LayerDef[] }) => void`
— Callback invoked after all layers have loaded.
`failedLayers` contains the definitions of any layers
whose GeoJSON files failed to fetch.
