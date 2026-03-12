// --- SVG pattern engine ---

const NS = 'http://www.w3.org/2000/svg';

export function buildPatternContent(parent, cfg, color) {
    switch (cfg.type) {
        case 'diagonal': {
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', cfg.size);
            line.setAttribute('x2', cfg.size);
            line.setAttribute('y2', 0);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', cfg.strokeWidth);
            parent.appendChild(line);
            break;
        }
        case 'crosshatch': {
            const l1 = document.createElementNS(NS, 'line');
            l1.setAttribute('x1', 0); l1.setAttribute('y1', cfg.size);
            l1.setAttribute('x2', cfg.size); l1.setAttribute('y2', 0);
            l1.setAttribute('stroke', color); l1.setAttribute('stroke-width', cfg.strokeWidth);
            const l2 = document.createElementNS(NS, 'line');
            l2.setAttribute('x1', 0); l2.setAttribute('y1', 0);
            l2.setAttribute('x2', cfg.size); l2.setAttribute('y2', cfg.size);
            l2.setAttribute('stroke', color); l2.setAttribute('stroke-width', cfg.strokeWidth);
            parent.appendChild(l1);
            parent.appendChild(l2);
            break;
        }
        case 'dots': {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', cfg.size / 2);
            c.setAttribute('cy', cfg.size / 2);
            c.setAttribute('r', cfg.radius);
            c.setAttribute('fill', color);
            parent.appendChild(c);
            break;
        }
        case 'stipple': {
            const c1 = document.createElementNS(NS, 'circle');
            c1.setAttribute('cx', cfg.size * 0.25);
            c1.setAttribute('cy', cfg.size * 0.25);
            c1.setAttribute('r', cfg.radius);
            c1.setAttribute('fill', color);
            const c2 = document.createElementNS(NS, 'circle');
            c2.setAttribute('cx', cfg.size * 0.75);
            c2.setAttribute('cy', cfg.size * 0.7);
            c2.setAttribute('r', cfg.radius);
            c2.setAttribute('fill', color);
            parent.appendChild(c1);
            parent.appendChild(c2);
            break;
        }
        case 'circles': {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', cfg.size / 2);
            c.setAttribute('cy', cfg.size / 2);
            c.setAttribute('r', cfg.radius);
            c.setAttribute('fill', 'none');
            c.setAttribute('stroke', color);
            c.setAttribute('stroke-width', cfg.strokeWidth);
            parent.appendChild(c);
            break;
        }
        case 'horizontal': {
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', cfg.size / 2);
            line.setAttribute('x2', cfg.size);
            line.setAttribute('y2', cfg.size / 2);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', cfg.strokeWidth);
            parent.appendChild(line);
            break;
        }
    }
}

export function createPatternDefs(styles, patterns) {
    const defs = document.createElementNS(NS, 'defs');
    defs.setAttribute('data-map-patterns', 'true');

    for (const [layerId, cfg] of Object.entries(patterns)) {
        const style = styles[layerId];
        if (!style) continue;
        const color = style.fillColor || style.color;
        const pat = document.createElementNS(NS, 'pattern');
        pat.setAttribute('id', `pattern-${layerId}`);
        pat.setAttribute('patternUnits', 'userSpaceOnUse');
        pat.setAttribute('width', cfg.size);
        pat.setAttribute('height', cfg.size);
        buildPatternContent(pat, cfg, color);
        defs.appendChild(pat);
    }
    return defs;
}

export function injectPatterns(styles, patterns) {
    const svgs = document.querySelectorAll('.leaflet-overlay-pane svg, .leaflet-pane svg');
    svgs.forEach(svg => {
        const existing = svg.querySelector('defs[data-map-patterns]');
        if (existing) return;
        svg.insertBefore(createPatternDefs(styles, patterns), svg.firstChild);
    });
}

export function injectPatternCSS(patterns) {
    if (document.getElementById('leaflet-atlas-pattern-css')) return;
    const rules = Object.keys(patterns).map(
        layerId => `.layer-${layerId} { fill: url(#pattern-${layerId}) !important; }`
    ).join('\n');
    const style = document.createElement('style');
    style.id = 'leaflet-atlas-pattern-css';
    style.textContent = rules;
    document.head.appendChild(style);
}
