# How to configure detail panels

Detail panels display feature information when a user
clicks a map feature. They support navigation history,
cross-links between features, and reverse links.

## Detail builders

Detail builders are defined as a function that receives
a `helpers` object and returns a map of layer id to
builder function. Each builder receives the feature's
`properties` and returns an HTML string.

```js
{
  detailBuilders: (helpers) => ({
    cities: (props) =>
      helpers.buildDetail(props.name, 'cities', [
        {
          label: 'General',
          rows: [
            ['Country', props.country],
            [
              'Population',
              props.population?.toLocaleString(),
            ],
            [
              'Elevation',
              props.elevation
                ? `${props.elevation} m`
                : null,
            ],
          ].filter(([, v]) => v != null),
        },
        {
          label: 'Sources',
          rows: [
            helpers.sourceRow({
              name: 'Wikipedia',
              url: props.wiki_url,
            }),
          ].filter(Boolean),
        },
      ]),
  }),
}
```

### The helpers object

| Method                              | Description           |
| ----------------------------------- | --------------------- |
| `buildDetail(title, layerId, grps)` | Builds standard HTML  |
| `buildReverseLinksSection(data, l)` | Builds reverse links  |
| `sourceRow({ name, url })`          | Returns a source row  |
| `getReverseLinks()`                 | Returns reverse data  |
| `eachLayerFeature(layerId, cb)`     | Iterates features     |
| `getLayerLabel(layerId)`            | Returns layer label   |
| `findLayerByProperty(layerId, fn)`  | Finds layer by match  |
| `findLayerByIndex(layerId, idx)`    | Finds layer by index  |
| `findFeatureIndex(layerId, layer)`  | Returns feature index |

### Row format

Each row in a group is a two-element array:
`[label, value]`.

- Strings are HTML-escaped automatically
- To insert raw HTML, use `{ __html: '<em>bold</em>' }`
  (via the `rawHtml()` helper)
- `null`/`undefined` rows are filtered out

## Tooltips

Show a tooltip on feature hover:

```js
{
  tooltips: {
    cities: (props) => props.name,
  },
}
```

Return `null` or an empty string to suppress the tooltip
for a specific feature.

## Cross-links

Cross-links let you navigate from one feature's detail
panel to another.

### Built-in feature links

Use the `featureLink` helper in your detail builder:

```js
import { featureLink } from 'leaflet-atlas';

// In a detail builder:
const row = [
  'Capital',
  {
    __html: featureLink(
      'cities',
      capitalIndex,
      props.capital_name
    ),
  },
];
```

Clicking the link zooms to the target feature and opens
its detail panel.

### Custom cross-link types

Define custom link types and handlers:

```js
import { crossLink } from 'leaflet-atlas';

// In a detail builder:
const row = [
  'Region',
  {
    __html: crossLink(
      'region',
      props.region_code,
      props.region_name
    ),
  },
];
```

Then register a handler:

```js
{
  crossLinkHandlers: {
    region: (app, value, linkElement) => {
      const layer = app.findLayerByProperty(
        'regions',
        (p) => p.code === value
      );
      if (!layer) return;
      app.ensureLayerVisible('regions');
      app.getMap().fitBounds(layer.getBounds());
      app.showFeatureDetail(
        'regions',
        app.findFeatureIndex('regions', layer)
      );
    },
  },
}
```

## Reverse links

Reverse links show which features from other layers
reference the current feature. Load them from a JSON file:

```js
{
  reverseLinksUrl: 'data/reverse-links.json',
}
```

The JSON structure:

```json
{
  "cities": {
    "0": {
      "regions": [
        { "index": 3, "label": "Ile-de-France" }
      ]
    }
  }
}
```

Use in a detail builder:

```js
detailBuilders: (helpers) => ({
  cities: (props) => {
    const reverseLinks = helpers.getReverseLinks();
    const idx = helpers.findFeatureIndex(
      'cities',
      currentLayer
    );
    const links = reverseLinks?.cities?.[idx];
    const reverseSection =
      helpers.buildReverseLinksSection(
        links,
        'Referenced by'
      );

    return helpers.buildDetail(
      props.name,
      'cities',
      [
        {
          label: 'Info',
          rows: [['Country', props.country]],
        },
        ...(reverseSection ? [reverseSection] : []),
      ]
    );
  },
}),
```
