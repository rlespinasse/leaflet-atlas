# How to configure layers

This guide covers layer groups, context layers, styles,
patterns, mask layers, and panes.

## Layer groups

Layers are organised into named groups. Each group appears
as a collapsible section in the layers drawer.

```js
{
  layerGroups: [
    {
      group: 'Administrative',
      layers: [
        {
          id: 'regions',
          label: 'Regions',
          file: 'data/regions.geojson',
          active: true,
        },
        {
          id: 'departments',
          label: 'Departments',
          file: 'data/departments.geojson',
          active: false,
        },
      ],
    },
    {
      group: 'Infrastructure',
      layers: [
        {
          id: 'roads',
          label: 'Roads',
          file: 'data/roads.geojson',
          active: true,
        },
      ],
    },
  ],
}
```

Each layer definition has:

| Property | Type    | Description                    |
| -------- | ------- | ------------------------------ |
| `id`     | string  | Unique identifier              |
| `label`  | string  | Display name in the drawer     |
| `file`   | string  | Path or URL to a GeoJSON file  |
| `active` | boolean | Visible on load (default true) |

## Context layers

Context layers appear in a separate "Contexte" section at
the top of the drawer. They behave like regular layers but
do not bring to front on hover.

```js
{
  contextLayers: [
    {
      id: 'boundary',
      label: 'Country boundary',
      file: 'data/boundary.geojson',
      active: true,
    },
  ],
}
```

## Styles

Styles are keyed by layer id. They use standard
[Leaflet path options][path].

[path]: https://leafletjs.com/reference.html#path-option

```js
{
  styles: {
    regions: {
      color: '#264653',
      fillColor: '#2a9d8f',
      fillOpacity: 0.3,
      weight: 2,
    },
    departments: {
      color: '#e76f51',
      fillColor: '#f4a261',
      fillOpacity: 0.2,
      weight: 1,
    },
    roads: {
      color: '#e63946',
      weight: 3,
      dashArray: '8 4',
    },
    cities: {
      radius: 6,
      color: '#1d3557',
      fillColor: '#457b9d',
      fillOpacity: 0.8,
    },
  },
}
```

For point layers, include `radius` to render circle
markers instead of default markers.

Hover styles are generated automatically: polygons get
increased weight and opacity, circle markers get a
larger radius.

## Geometry types

By default, leaflet-atlas infers geometry type from the
style (`radius` -> point, otherwise polygon). Override
this for line layers:

```js
{
  geometryTypes: {
    roads: 'line',
  },
}
```

Valid values: `'point'`, `'line'`, `'polygon'`.

## SVG patterns

Add pattern fills to polygon layers. Supported types:
diagonal, crosshatch, dots, stipple, circles, horizontal.

```js
{
  patterns: {
    regions: {
      type: 'diagonal',
      size: 8,
      strokeWidth: 1.5,
    },
    parks: {
      type: 'dots',
      size: 6,
      radius: 1.5,
    },
    wetlands: {
      type: 'crosshatch',
      size: 10,
      strokeWidth: 1,
    },
    reserves: {
      type: 'circles',
      size: 10,
      radius: 3,
      strokeWidth: 1,
    },
  },
}
```

| Pattern type | Properties                      |
| ------------ | ------------------------------- |
| `diagonal`   | `size`, `strokeWidth`           |
| `crosshatch` | `size`, `strokeWidth`           |
| `horizontal` | `size`, `strokeWidth`           |
| `dots`       | `size`, `radius`                |
| `stipple`    | `size`, `radius`                |
| `circles`    | `size`, `radius`, `strokeWidth` |

## Mask layer

Dim everything outside a boundary polygon:

```js
{
  maskLayer: {
    sourceLayerId: 'boundary',
    fillColor: '#000',
    fillOpacity: 0.3,
  },
}
```

The `sourceLayerId` references the layer whose first
feature defines the hole. The mask is tied to the
visibility of the source layer — toggling it off
removes the mask.

## Custom panes

Control z-order and pointer events with
[Leaflet panes][panes]:

[panes]: https://leafletjs.com/reference.html#map-pane

```js
{
  panes: {
    background: {
      zIndex: 250,
      pointerEvents: 'none',
    },
    borders: { zIndex: 450 },
  },
  layerPanes: {
    boundary: 'background',
  },
}
```

## Border click layers

For polygon layers where you want click/hover only on
the border (not the fill), add an invisible wide-stroke
click layer on a separate pane:

```js
{
  panes: {
    clicks: { zIndex: 500 },
  },
  borderClickLayers: {
    regions: 'clicks',
  },
}
```

## Bounds layer

Set `boundsLayerId` to auto-fit the map to a layer's
extent on load:

```js
{
  boundsLayerId: 'regions',
}
```

If the bounds layer is not available, `boundsFallback`
(or `map.center`/`map.zoom`) is used.
