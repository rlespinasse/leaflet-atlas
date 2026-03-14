// --- Generic utility functions (no external dependencies) ---

export function normalizeText(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function rawHtml(str) {
    return { __html: str };
}

export function renderValue(val) {
    if (val && typeof val === 'object' && val.__html) return val.__html;
    return escapeHtml(val);
}

export function joinNotNull(arr) {
    return arr.filter(v => v && v !== 'None').join(', ');
}

// --- Cross-link helpers ---

export function crossLink(type, value, displayText, extraAttrs) {
    if (!value || value === 'None') return '';
    const attrs = extraAttrs || '';
    return `<a href="#" class="cross-link" data-link-type="${escapeHtml(type)}" data-link-value="${escapeHtml(value)}"${attrs}>${escapeHtml(displayText || value)}<span class="cross-link-icon"> \u21AA</span></a>`;
}

export function featureLink(layerId, featureIndex, displayText) {
    return `<a href="#" class="cross-link" data-link-type="feature" data-link-layer="${escapeHtml(layerId)}" data-link-value="${featureIndex}">${escapeHtml(displayText)}<span class="cross-link-icon"> \u21AA</span></a>`;
}

// --- Toggle state ---

const DEFAULT_LABELS = {
    hide: 'Masquer',
    show: 'Afficher',
};

export function setToggleState(btn, active, scope, partial, labels) {
    const l = labels || DEFAULT_LABELS;
    btn.classList.toggle('active', active && !partial);
    btn.classList.toggle('inactive', !active);
    btn.classList.toggle('partial', !!partial);
    btn.textContent = active ? '\u2212' : '+';
    btn.title = `${active ? l.hide : l.show} ${scope}`;
}

// --- Point-in-polygon (ray casting) ---

function pointInRing(point, ring) {
    let inside = false;
    const [px, py] = point;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

export function pointInGeometry(latlng, geometry) {
    const point = [latlng.lng, latlng.lat];
    const type = geometry.type;
    const coords = geometry.coordinates;
    if (type === 'Polygon') {
        if (!pointInRing(point, coords[0])) return false;
        for (let h = 1; h < coords.length; h++) {
            if (pointInRing(point, coords[h])) return false;
        }
        return true;
    }
    if (type === 'MultiPolygon') {
        for (const poly of coords) {
            if (!pointInRing(point, poly[0])) continue;
            let inHole = false;
            for (let h = 1; h < poly.length; h++) {
                if (pointInRing(point, poly[h])) { inHole = true; break; }
            }
            if (!inHole) return true;
        }
    }
    return false;
}

export function featureBoundsArea(feature) {
    const coords = feature.geometry.coordinates;
    let allCoords = [];
    const type = feature.geometry.type;
    if (type === 'Polygon') allCoords = coords[0];
    else if (type === 'MultiPolygon') coords.forEach(p => allCoords.push(...p[0]));
    else return Infinity;
    if (allCoords.length === 0) return Infinity;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of allCoords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    return (maxX - minX) * (maxY - minY);
}

// --- Tile thumbnail URL ---

export function buildTileThumbnailUrl(urlTemplate, center, zoom, options) {
    const lat = center[0];
    const lng = center[1];
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);

    let url = urlTemplate
        .replace('{z}', zoom)
        .replace('{x}', x)
        .replace('{y}', y);

    const subdomains = (options && options.subdomains) || 'abc';
    url = url.replace('{s}', subdomains[0]);

    return url;
}
// --- Hover style ---

export function getHoverStyle(layerId, styles) {
    const base = styles[layerId];
    if (!base) return {};
    if (base.radius) {
        return { radius: base.radius + 2, weight: 3, fillOpacity: 0.9 };
    }
    return { weight: (base.weight || 2) + 2, fillOpacity: Math.min((base.fillOpacity || 0.2) + 0.2, 0.8) };
}

// --- Highlight ---

export function highlightFeature(layer, layerId, styles, opts) {
    if (!layer || !layer.setStyle) return;
    const orig = styles[layerId];
    const highlightStyle = opts && opts.style ? opts.style : { weight: 4, fillOpacity: 0.5, color: '#e57373' };
    const duration = opts && opts.duration ? opts.duration : 2500;
    if (opts && opts.bringToFront && layer.bringToFront) layer.bringToFront();
    layer.setStyle(highlightStyle);
    setTimeout(() => layer.setStyle(orig), duration);
}
