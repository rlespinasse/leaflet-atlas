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
