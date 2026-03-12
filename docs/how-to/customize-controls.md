# How to customize controls

This guide covers UI labels, keyboard shortcuts,
analytics, and legal pages.

## Labels (i18n)

All UI text is overridable via the `labels` config.
Defaults are in French.

```js
{
  labels: {
    // Layers drawer
    layers: 'Layers',
    basemap: 'Base map',
    close: 'Close',
    layerScope: 'layer',
    groupScope: 'group',

    // Search
    searchPlaceholder: 'Search a place...',
    searchLabel: 'Search',
    searchClear: 'Clear',
    searchClearLabel: 'Clear search',
    noResults: 'No results',

    // Zoom / view
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fullExtent: 'Full extent',
    resetView: 'Reset view',

    // Overlays
    shortcuts: 'Keyboard shortcuts',
    legal: 'Legal notices',
    closeHelp: 'Close help',
    closeLegal: 'Close legal notices',

    // Loading
    loading: 'Loading data...',

    // Toggle buttons
    hide: 'Hide',
    show: 'Show',

    // Keyboard shortcuts labels
    shortcutHelp: 'Keyboard shortcuts',
    shortcutSearch: 'Search',
    shortcutExtent: 'Full extent',
    shortcutReset: 'Reset view',
    shortcutLayers: 'Layers (open/close)',
    shortcutPanel: 'Panel (open/close)',
    shortcutBack: 'Panel: previous',
    shortcutForward: 'Panel: next',
    shortcutZoomIn: 'Zoom in',
    shortcutZoomOut: 'Zoom out',
    shortcutLegal: 'Legal notices',
    shortcutClose: 'Close',
  },
}
```

## Search

Enable search by defining `searchableProps` for each
searchable layer:

```js
{
  searchableProps: {
    cities: {
      title: (props) => props.name,
      meta: (props) => props.country,
      text: ['name', 'country', 'alt_name'],
    },
  },
}
```

Search is case-insensitive, supports multiple terms
(all must match), and is debounced at 150ms.

## Keyboard shortcuts

Default shortcuts are built in. Override them entirely
by providing a `shortcuts` array:

```js
{
  shortcuts: [
    {
      key: '?',
      label: 'Keyboard shortcuts',
      action: () => { /* toggle help */ },
      matchRaw: true,
    },
    {
      key: 'f',
      label: 'Search',
      action: (e) => {
        e.preventDefault();
        /* focus search */
      },
    },
  ],
}
```

Each shortcut object:

| Property     | Type     | Description              |
| ------------ | -------- | ------------------------ |
| `key`        | string   | Key to match             |
| `label`      | string   | Help overlay description |
| `action`     | function | Callback `(event) =>`   |
| `matchRaw`   | boolean  | Exact `e.key` match     |
| `displayKey` | string   | Override help label      |
| `event`      | string   | Analytics event path     |
| `eventLabel` | string   | Analytics event label    |

Default keyboard shortcuts:

| Key   | Action                      |
| ----- | --------------------------- |
| `?`   | Toggle help overlay         |
| `F`   | Focus search                |
| `E`   | Full extent                 |
| `R`   | Reset view to defaults      |
| `C`   | Toggle layers drawer        |
| `P`   | Toggle detail panel         |
| `H`   | Panel: navigate back        |
| `J`   | Panel: navigate forward     |
| `+`   | Zoom in                     |
| `-`   | Zoom out                    |
| `L`   | Toggle legal overlay        |
| `Esc` | Close overlays/drawer/panel |

## Analytics

Pluggable analytics with GoatCounter built in:

```js
{
  analytics: {
    provider: 'goatcounter',
    basePath: '/my-atlas/',
  },
}
```

Events tracked automatically: feature clicks, search,
layer toggles, drawer open/close, zoom, shortcuts, base
map changes, and page views.

Analytics are disabled on localhost.

## Legal pages

Display a tabbed overlay with legal notices:

```js
{
  legalPages: [
    {
      id: 'privacy',
      label: 'Privacy',
      content: '<h3>Privacy Policy</h3>' +
        '<p>We collect no personal data.</p>',
    },
    {
      id: 'credits',
      label: 'Credits',
      content: '<h3>Credits</h3>' +
        '<p>Map data &copy; OSM contributors.</p>',
    },
  ],
}
```

When `legalPages` is defined, a legal button appears in
the bottom bar and the `L` shortcut toggles the overlay.

## onReady callback

Run code after all layers have loaded:

```js
{
  onReady: (app) => {
    console.log('All layers loaded');
  },
}
```
