# leaflet-atlas

A config-driven [Leaflet](https://leafletjs.com/) framework
for building interactive GeoJSON map applications.

Pass a single configuration object to `MapApp` and get a
full-featured map with layer management, search, detail
panels, keyboard shortcuts, URL state persistence, and more.

## Install

### npm / bundler

```bash
npm install leaflet-atlas leaflet
```

```js
import { MapApp } from 'leaflet-atlas';
import 'leaflet-atlas/css';
import 'leaflet/dist/leaflet.css';
```

### CDN (script tag)

```html
<link rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9/dist/leaflet.css" />
<link rel="stylesheet"
  href="https://unpkg.com/leaflet-atlas@0.2.0/dist/leaflet-atlas.css" />
<script
  src="https://unpkg.com/leaflet@1.9/dist/leaflet.js">
</script>
<script
  src="https://unpkg.com/leaflet-atlas@0.2.0/dist/leaflet-atlas.umd.js">
</script>
```

When loaded via `<script>`, the library is available as
the global `LeafletAtlas`.

## Quick start

```html
<main>
  <div id="map"></div>
</main>
```

```js
const app = new MapApp({
  map: {
    elementId: 'map',
    center: [46.6, 2.5],
    zoom: 6,
  },
  baseLayers: {
    OpenStreetMap: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
  },
  layerGroups: [
    {
      group: 'Points of interest',
      layers: [
        {
          id: 'cities',
          label: 'Cities',
          file: 'data/cities.geojson',
          active: true,
        },
      ],
    },
  ],
  styles: {
    cities: {
      radius: 6,
      color: '#e63946',
      fillColor: '#e63946',
      fillOpacity: 0.8,
    },
  },
});
```

## Features

### Layers & styling

- **Layer management** — toggle layer groups and
  individual layers via a slide-out drawer with feature
  counts and in-drawer filtering
- **Context layers** — dedicated drawer section for
  reference layers that stay in the background
- **Multiple base layers** — switch between tile providers
  with thumbnail cards
- **SVG fill patterns** — diagonal, crosshatch, dots,
  stipple, circles, and horizontal line fills
- **Auto z-index sorting** — layers are ordered
  automatically by geometry type and feature size
- **Mask layer** — dim areas outside a boundary polygon

### Search & interaction

- **Search** — multi-term full-text search across
  configurable feature properties, with hover highlighting
- **Tooltips** — per-layer hover tooltips on map features
- **Detail panels** — click a feature to open a resizable
  detail panel with back/forward navigation history
- **Cross-links** — navigate between related features
  across layers, with reverse-link support

### Navigation & state

- **Keyboard shortcuts** — fully configurable, with a
  built-in help overlay
- **URL hash state** — active layers, map view, base
  layer, and selected feature are persisted in the URL
  for deep linking

### Customization

- **i18n-ready** — all UI labels are overridable via the
  `labels` config
- **Detail builders** — custom HTML builders per layer
  with cross-layer query helpers
- **Title overlay** — configurable heading, subtitle, and
  icon
- **Analytics** — pluggable analytics (GoatCounter
  supported out of the box)
- **Legal pages** — tabbed overlay for legal notices
- **Responsive** — adapts to mobile viewports

## Documentation

- [Getting started tutorial](docs/tutorials/getting-started.md)
- **How-to guides**
  - [Install](docs/how-to/install.md)
  - [Configure layers](docs/how-to/configure-layers.md)
  - [Configure detail panels](docs/how-to/configure-detail-panels.md)
  - [Customize controls](docs/how-to/customize-controls.md)
- **Explanation**
  - [Architecture](docs/explanation/architecture.md)
  - [Release process](docs/explanation/release-process.md)
- **Reference**
  - [Configuration](docs/reference/configuration.md)
  - [API](docs/reference/api.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
