# Tutorial: Getting started with leaflet-atlas

In this tutorial you will build an interactive map that
displays GeoJSON data with styled layers, search, and a
detail panel — all from a single configuration object.

## Prerequisites

- Node.js 18+ and npm
- Basic knowledge of HTML and JavaScript
- Familiarity with [Leaflet](https://leafletjs.com/)
  concepts (maps, layers, GeoJSON)

## Step 1: Set up the project

Create a new directory and initialise it:

```bash
mkdir my-atlas && cd my-atlas
npm init -y
npm install leaflet-atlas leaflet
npm install -D vite
```

Add a dev script to `package.json`:

```json
{
  "scripts": {
    "dev": "vite"
  }
}
```

## Step 2: Create the HTML shell

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0" />
  <title>My Atlas</title>
</head>
<body>
  <main>
    <div id="map"></div>
  </main>
  <script type="module" src="main.js"></script>
</body>
</html>
```

The map container must be inside a `<main>` element —
leaflet-atlas attaches the detail panel and layers drawer
to it.

## Step 3: Prepare GeoJSON data

Create `data/places.geojson` with a few point features:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Paris",
        "country": "France",
        "population": 2161000
      },
      "geometry": {
        "type": "Point",
        "coordinates": [2.3522, 48.8566]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Lyon",
        "country": "France",
        "population": 516092
      },
      "geometry": {
        "type": "Point",
        "coordinates": [4.8357, 45.7640]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Marseille",
        "country": "France",
        "population": 870018
      },
      "geometry": {
        "type": "Point",
        "coordinates": [5.3698, 43.2965]
      }
    }
  ]
}
```

## Step 4: Write the application code

Create `main.js`:

```js
import 'leaflet/dist/leaflet.css';
import 'leaflet-atlas/css';
import { MapApp, buildDetail } from 'leaflet-atlas';

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
      group: 'Places',
      layers: [
        {
          id: 'places',
          label: 'Cities',
          file: 'data/places.geojson',
          active: true,
        },
      ],
    },
  ],

  styles: {
    places: {
      radius: 8,
      color: '#1d3557',
      fillColor: '#457b9d',
      fillOpacity: 0.9,
      weight: 2,
    },
  },

  searchableProps: {
    places: {
      title: (p) => p.name,
      meta: (p) => p.country,
      text: ['name', 'country'],
    },
  },

  tooltips: {
    places: (p) => p.name,
  },

  boundsLayerId: 'places',

  detailBuilders: (helpers) => ({
    places: (props) =>
      helpers.buildDetail(props.name, 'places', [
        {
          label: 'Info',
          rows: [
            ['Country', props.country],
            [
              'Population',
              props.population?.toLocaleString(),
            ],
          ],
        },
      ]),
  }),
});
```

## Step 5: Run the application

```bash
npm run dev
```

Open the URL shown by Vite. You should see:

1. A map centered on France with three circle markers
1. A layers drawer (click the layers icon in the bottom
   bar)
1. A search bar — type "Lyon" to find and zoom to it
1. Click a marker to open the detail panel with feature
   properties
1. Press `?` to see all keyboard shortcuts

## What you've learned

- How to structure the HTML container
  (`<main>` > `<div id="map">`)
- How to define base layers, layer groups, and styles
- How to enable search, tooltips, and detail panels
  via configuration
- How the `boundsLayerId` controls the initial map extent

## Next steps

- [Configure layers](../how-to/configure-layers.md) —
  layer groups, context layers, patterns, and mask layers
- [Configure detail panels](../how-to/configure-detail-panels.md)
  — custom builders, cross-links, and reverse links
- [Customize controls](../how-to/customize-controls.md) —
  labels, shortcuts, analytics, and legal pages
- [Configuration reference](../reference/configuration.md)
  — full config object schema
