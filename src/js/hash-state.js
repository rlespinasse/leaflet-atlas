// --- URL hash state persistence ---

export function parseHash() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const state = {};

    if (params.has('layers')) {
        state.layers = params.get('layers').split(',').filter(Boolean);
    }
    if (params.has('base')) {
        state.base = params.get('base');
    }
    if (params.has('lat') && params.has('lng') && params.has('z')) {
        state.lat = parseFloat(params.get('lat'));
        state.lng = parseFloat(params.get('lng'));
        state.zoom = parseInt(params.get('z'), 10);
    }
    if (params.has('sel')) {
        const parts = params.get('sel').split(',');
        if (parts.length >= 2) {
            state.sel = { layerId: parts[0], featureIndex: parseInt(parts[1], 10) };
        }
    }
    return state;
}

export function buildHash({ allLayerDefs, map, baseLayers, defaultBaseLayer, selectedFeatureInfo }) {
    const params = new URLSearchParams();

    const activeLayers = allLayerDefs
        .filter(d => d._leafletLayer && map.hasLayer(d._leafletLayer))
        .map(d => d.id);
    const defaultLayers = allLayerDefs
        .filter(d => d.active !== false)
        .map(d => d.id);

    if (!arraysEqual(activeLayers.slice().sort(), defaultLayers.slice().sort())) {
        params.set('layers', activeLayers.join(','));
    }

    const activeBase = getActiveBaseLayerName(baseLayers, map, defaultBaseLayer);
    if (activeBase !== defaultBaseLayer) {
        params.set('base', activeBase);
    }

    const center = map.getCenter();
    const zoom = map.getZoom();
    params.set('lat', center.lat.toFixed(5));
    params.set('lng', center.lng.toFixed(5));
    params.set('z', zoom);

    if (selectedFeatureInfo) {
        params.set('sel', selectedFeatureInfo.layerId + ',' + selectedFeatureInfo.featureIndex);
    }

    return params.toString();
}

function getActiveBaseLayerName(baseLayers, map, defaultName) {
    for (const name of Object.keys(baseLayers)) {
        if (map.hasLayer(baseLayers[name])) return name;
    }
    return defaultName;
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
