# How to install leaflet-atlas

## Prerequisites

- [Leaflet](https://leafletjs.com/) ^1.9.0
  (peer dependency)

## npm / bundler

```bash
npm install leaflet-atlas leaflet
```

Import the module and its CSS:

```js
import { MapApp } from 'leaflet-atlas';
import 'leaflet-atlas/css';
import 'leaflet/dist/leaflet.css';
```

Works with Vite, webpack, Rollup, esbuild, and any
bundler that supports ES modules.

## CDN — unpkg

```html
<link rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9/dist/leaflet.css" />
<link rel="stylesheet"
  href="https://unpkg.com/leaflet-atlas@0.1.1/dist/leaflet-atlas.css" />

<script
  src="https://unpkg.com/leaflet@1.9/dist/leaflet.js">
</script>
<script
  src="https://unpkg.com/leaflet-atlas@0.1.1/dist/leaflet-atlas.umd.js">
</script>
```

## CDN — jsDelivr

```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/leaflet@1.9/dist/leaflet.css" />
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/leaflet-atlas@0.1.1/dist/leaflet-atlas.css"
  />

<script
  src="https://cdn.jsdelivr.net/npm/leaflet@1.9/dist/leaflet.js">
</script>
<script
  src="https://cdn.jsdelivr.net/npm/leaflet-atlas@0.1.1/dist/leaflet-atlas.umd.js">
</script>
```

## Using the UMD global

When loaded via `<script>` tag, all exports are available
on the `LeafletAtlas` global:

```html
<script>
  const app = new LeafletAtlas.MapApp({ /* config */ });
</script>
```

## HTML structure

The map container must have a parent element. leaflet-atlas
appends the layers drawer and detail panel to the map
container's parent:

```html
<main>
  <div id="map"></div>
</main>
```

Any element can serve as the parent — `<main>`, `<div>`,
`<section>`, etc.
