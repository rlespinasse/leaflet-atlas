// --- leaflet-atlas public API ---

import '../css/index.css';

export { MapApp } from './map-app.js';

// HTML builders for detail panels
export { buildDetail, buildReverseLinksSection, sourceRow } from './detail-panel.js';

// Generic utilities
export {
    normalizeText,
    escapeHtml,
    rawHtml,
    renderValue,
    joinNotNull,
    crossLink,
    featureLink,
    setToggleState,
    getHoverStyle,
    highlightFeature,
} from './helpers.js';

// Analytics
export { createAnalytics, isLocalhost } from './analytics.js';

// Patterns
export { buildPatternContent, createPatternDefs, injectPatterns, injectPatternCSS } from './patterns.js';
