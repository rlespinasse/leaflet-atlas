// --- MapApp: main orchestrator class ---

import L from 'leaflet';
import { escapeHtml, getHoverStyle, highlightFeature as _highlightFeature, setToggleState } from './helpers.js';
import { createAnalytics } from './analytics.js';
import { injectPatterns, injectPatternCSS } from './patterns.js';
import { parseHash, buildHash } from './hash-state.js';
import { DetailPanel, buildDetail as _buildDetail, buildReverseLinksSection as _buildReverseLinksSection, sourceRow } from './detail-panel.js';
import { createLayersDrawer, createSearchControl, createBottomBarControl } from './controls.js';

export class MapApp {
    constructor(config) {
        // -- State setup --
        this._config = config;
        this._allLayerDefs = [
            ...config.layerGroups.flatMap(g => g.layers),
            ...(config.contextLayers || [])
        ];
        this._reverseLinks = null;
        this._searchIndex = [];
        this._hoveredLayer = null;
        this._hoveredLayerId = null;
        this._mask = null;
        this._loadedCount = 0;
        this._searchInput = null;
        this._helpOverlay = null;
        this._legalOverlay = null;
        this._baseLayers = {};
        this._baseLayerThumbnails = {};
        this._contextLayerIds = new Set((config.contextLayers || []).map(d => d.id));
        this._analytics = createAnalytics(config.analytics);

        // -- DOM setup --
        this._initMap();
        this._initBaseLayers();
        this._initTitle();
        this._initDetailPanel();
        this._initPanes();
        this._initLoadingOverlay();

        // -- Behavior setup --
        this._initialHashState = parseHash();
        this._initDetailBuilders(); // before controls (search needs builders)
        this._initControls();
        this._shortcuts = this._buildShortcuts();
        this._initHelpOverlay();
        this._initLegalOverlay();
        this._initKeyboardShortcuts();
        this._initResizeHandle();
        this._loadData();
    }

    // --- Initialization ---

    _initMap() {
        const cfg = this._config.map || {};
        this._map = L.map(cfg.elementId || 'map', {
            zoomControl: false,
            zoomSnap: cfg.zoomSnap !== undefined ? cfg.zoomSnap : 0.5
        }).setView(cfg.center || [0, 0], cfg.zoom || 2);
    }

    _initBaseLayers() {
        const cfg = this._config.baseLayers || {};
        for (const [name, def] of Object.entries(cfg)) {
            this._baseLayers[name] = L.tileLayer(def.url, def.options || {});
            if (def.thumbnailUrl) {
                this._baseLayerThumbnails[name] = def.thumbnailUrl;
            }
        }

        const defaultName = this._config.defaultBaseLayer || Object.keys(this._baseLayers)[0];
        if (this._baseLayers[defaultName]) {
            this._baseLayers[defaultName].addTo(this._map);
        }
    }

    _initTitle() {
        const cfg = this._config.title;
        if (!cfg) return;

        const TitleControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function () {
                const div = L.DomUtil.create('div', 'title-overlay');
                div.innerHTML = `<div class="title-text"><h1>${cfg.heading || ''}</h1>` +
                    (cfg.subtitle ? `<p>${cfg.subtitle}</p>` : '') + `</div>` +
                    (cfg.icon ? `<img src="${cfg.icon}" alt="" class="title-icon">` : '');
                L.DomEvent.disableClickPropagation(div);
                return div;
            }
        });
        new TitleControl().addTo(this._map);
    }

    _initDetailPanel() {
        const container = this._map.getContainer().parentElement;
        this._detailPanel = new DetailPanel(container, {
            onHide: () => {
                if (this._loadedCount >= this._allLayerDefs.length) this.updateHash();
            },
            trackEvent: (path, title) => this._analytics.trackEvent(path, title)
        });
        this._detailPanel.setHashUpdateCallback(() => {
            if (this._loadedCount >= this._allLayerDefs.length) this.updateHash();
        });

        // Cross-link click handler
        this._detailPanel.getContentElement().addEventListener('click', e => {
            const link = e.target.closest('.cross-link');
            if (!link) return;
            e.preventDefault();
            const type = link.dataset.linkType;
            const value = link.dataset.linkValue;

            // Built-in 'feature' type
            if (type === 'feature') {
                const targetLayerId = link.dataset.linkLayer;
                const targetIndex = parseInt(value, 10);
                const found = this.findLayerByIndex(targetLayerId, targetIndex);
                if (!found) return;
                this.ensureLayerVisible(targetLayerId);
                if (found.getBounds) {
                    this._map.fitBounds(found.getBounds(), { padding: [50, 50], maxZoom: 16 });
                } else if (found.getLatLng) {
                    this._map.setView(found.getLatLng(), 16);
                }
                this.showFeatureDetail(targetLayerId, targetIndex, found.feature.properties);
                this.highlightFeature(found, targetLayerId, {
                    style: { weight: 4, fillOpacity: 0.5, color: '#e57373' },
                    bringToFront: true
                });
                return;
            }

            // Consumer-provided handlers
            const handlers = this._config.crossLinkHandlers || {};
            if (handlers[type]) {
                handlers[type](this, value, link);
            }
        });
    }

    _initPanes() {
        const panes = this._config.panes || {};
        for (const [paneName, opts] of Object.entries(panes)) {
            const pane = this._map.createPane(paneName);
            if (opts.zIndex !== undefined) pane.style.zIndex = opts.zIndex;
            if (opts.pointerEvents !== undefined) pane.style.pointerEvents = opts.pointerEvents;
        }
    }

    _initLoadingOverlay() {
        const container = this._map.getContainer().parentElement;
        const labels = this._config.labels || {};
        const loadingText = labels.loading || 'Chargement des donnees...';

        this._loadingOverlay = document.createElement('div');
        this._loadingOverlay.className = 'loading-overlay';
        this._loadingOverlay.innerHTML =
            '<div class="loading-spinner"></div>' +
            `<div class="loading-text">${escapeHtml(loadingText)}</div>`;
        container.appendChild(this._loadingOverlay);
    }

    _initControls() {
        this._layersDrawer = createLayersDrawer(
            this._config.layerGroups,
            this._config.contextLayers || [],
            this._baseLayers,
            this._baseLayerThumbnails,
            {
                map: this._map,
                maskRef: () => this._mask,
                hideDetail: () => this.hideDetail(),
                updateHash: () => this.updateHash(),
                allLayerDefs: this._allLayerDefs,
                trackEvent: (p, t) => this._analytics.trackEvent(p, t),
                maskLayerSourceId: this._config.maskLayer ? this._config.maskLayer.sourceLayerId : null,
                labels: this._config.labels
            }
        );
        // Pass styles/patterns/geometryTypes via options
        this._layersDrawer.options._styles = this._config.styles || {};
        this._layersDrawer.options._patterns = this._config.patterns || {};
        this._layersDrawer.options._geometryTypes = this._config.geometryTypes || {};
        this._layersDrawer.addTo(this._map);

        const noBringToFrontLayers = new Set(
            this._allLayerDefs
                .filter(d => this._contextLayerIds.has(d.id))
                .map(d => d.id)
        );

        const SearchControl = createSearchControl({
            map: this._map,
            styles: this._config.styles || {},
            searchIndex: this._searchIndex,
            allLayerDefs: this._allLayerDefs,
            detailBuilders: this._detailBuilders,
            ensureLayerVisible: id => this.ensureLayerVisible(id),
            showDetail: html => this.showDetail(html),
            updateHash: () => this.updateHash(),
            findFeatureIndex: (lid, lyr) => this.findFeatureIndex(lid, lyr),
            setSelectedFeatureInfo: info => this._detailPanel.setSelectedFeatureInfo(info),
            searchInputRef: input => { this._searchInput = input; },
            trackEvent: (p, t) => this._analytics.trackEvent(p, t),
            labels: this._config.labels,
            noBringToFrontLayers
        });
        this._SearchControl = SearchControl;

        const BottomBarControl = createBottomBarControl({
            map: this._map,
            layersDrawer: this._layersDrawer,
            toggleHelpOverlay: () => this._toggleHelpOverlay(),
            toggleLegalOverlay: this._config.legalPages ? () => this._toggleLegalOverlay() : null,
            hideDetail: () => this.hideDetail(),
            resetToDefaults: () => this._resetToDefaults(),
            fitBounds: () => this.fitBounds(),
            SearchControl,
            trackEvent: (p, t) => this._analytics.trackEvent(p, t),
            labels: this._config.labels
        });

        new BottomBarControl().addTo(this._map);

        // Map click handler
        this._map.on('click', () => {
            this.hideDetail();
            if (this._layersDrawer && this._layersDrawer.isOpen()) {
                this._layersDrawer.close();
            }
        });
    }

    _buildShortcuts() {
        const labels = this._config.labels || {};
        return this._config.shortcuts || [
            {
                key: '?', label: labels.shortcutHelp || 'Aide raccourcis clavier',
                action: () => this._toggleHelpOverlay(),
                event: 'event/shortcut/help', eventLabel: 'Shortcut help overlay',
                matchRaw: true
            },
            {
                key: 'f', label: labels.shortcutSearch || 'Rechercher',
                action: (e) => {
                    e.preventDefault();
                    if (this._searchInput) {
                        this._searchInput.classList.add('expanded');
                        this._searchInput.focus();
                    }
                },
                event: 'event/shortcut/search', eventLabel: 'Shortcut open search'
            },
            {
                key: 'e', label: labels.shortcutExtent || 'Vue d\u2019ensemble',
                action: () => { this.hideDetail(); this.fitBounds(); },
                event: 'event/shortcut/full-extent', eventLabel: 'Shortcut full extent'
            },
            {
                key: 'r', label: labels.shortcutReset || 'R\u00e9initialiser la vue',
                action: () => this._resetToDefaults(),
                event: 'event/shortcut/reset', eventLabel: 'Shortcut reset view'
            },
            {
                key: 'c', label: labels.shortcutLayers || 'Couches (ouvrir/fermer)',
                action: () => this._layersDrawer.toggle(),
                event: 'event/shortcut/layers', eventLabel: 'Shortcut layers drawer'
            },
            {
                key: 'p', label: labels.shortcutPanel || 'Panneau (ouvrir/fermer)',
                action: () => {
                    if (this._detailPanel.isOpen()) {
                        this.hideDetail();
                    } else {
                        this._detailPanel.reopenLast(this._map, this._layersDrawer);
                        if (this._loadedCount >= this._allLayerDefs.length) this.updateHash();
                    }
                },
                event: 'event/shortcut/toggle-panel', eventLabel: 'Shortcut toggle panel'
            },
            {
                key: 'h', label: labels.shortcutBack || 'Panneau : pr\u00e9c\u00e9dent',
                action: () => this._detailPanel.getBackButton().click(),
                event: 'event/shortcut/panel-back', eventLabel: 'Shortcut panel back'
            },
            {
                key: 'j', label: labels.shortcutForward || 'Panneau : suivant',
                action: () => this._detailPanel.getForwardButton().click(),
                event: 'event/shortcut/panel-forward', eventLabel: 'Shortcut panel forward'
            },
            {
                key: '+', label: labels.shortcutZoomIn || 'Zoom avant',
                event: 'event/shortcut/zoom-in', eventLabel: 'Shortcut zoom in',
                matchRaw: true
            },
            {
                key: '-', label: labels.shortcutZoomOut || 'Zoom arri\u00e8re',
                displayKey: '\u2212',
                event: 'event/shortcut/zoom-out', eventLabel: 'Shortcut zoom out',
                matchRaw: true
            },
            {
                key: 'l', label: labels.shortcutLegal || 'Mentions légales',
                action: () => this._toggleLegalOverlay(),
                event: 'event/shortcut/legal', eventLabel: 'Shortcut legal overlay'
            },
            {
                key: 'Escape', label: labels.shortcutClose || 'Fermer',
                displayKey: 'Echap',
                action: () => {
                    if (this._legalOverlay && this._legalOverlay.classList.contains('open')) {
                        this._legalOverlay.classList.remove('open');
                    } else if (this._helpOverlay && this._helpOverlay.classList.contains('open')) {
                        this._helpOverlay.classList.remove('open');
                    } else if (this._layersDrawer && this._layersDrawer.isOpen()) {
                        this._layersDrawer.close();
                    } else {
                        this.hideDetail();
                    }
                },
                matchRaw: true
            }
        ];
    }

    _initHelpOverlay() {
        const labels = this._config.labels || {};
        const shortcuts = this._shortcuts;

        const overlay = document.createElement('div');
        overlay.className = 'help-overlay';
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });

        const card = document.createElement('div');
        card.className = 'help-card';

        const title = document.createElement('h2');
        title.textContent = labels.shortcuts || 'Raccourcis clavier';
        card.appendChild(title);

        const table = document.createElement('table');
        shortcuts.forEach(s => {
            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            const kbd = document.createElement('kbd');
            kbd.textContent = s.displayKey || s.key.toUpperCase();
            tdKey.appendChild(kbd);
            const tdDesc = document.createElement('td');
            tdDesc.textContent = s.label;
            tr.appendChild(tdKey);
            tr.appendChild(tdDesc);
            table.appendChild(tr);
        });
        card.appendChild(table);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'help-close-btn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = labels.close || 'Fermer';
        closeBtn.setAttribute('aria-label', labels.closeHelp || 'Fermer l\u2019aide');
        closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
        card.appendChild(closeBtn);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        this._helpOverlay = overlay;
    }

    _toggleHelpOverlay() {
        if (!this._helpOverlay) return;
        if (!this._helpOverlay.classList.contains('open') && this._legalOverlay) {
            this._legalOverlay.classList.remove('open');
        }
        this._helpOverlay.classList.toggle('open');
    }

    _initLegalOverlay() {
        const pages = this._config.legalPages;
        if (!pages || pages.length === 0) return;
        const labels = this._config.labels || {};

        const overlay = document.createElement('div');
        overlay.className = 'legal-overlay';
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });

        const card = document.createElement('div');
        card.className = 'legal-card';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'legal-close-btn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = labels.close || 'Fermer';
        closeBtn.setAttribute('aria-label', labels.closeLegal || 'Fermer les mentions légales');
        closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
        card.appendChild(closeBtn);

        const tabBar = document.createElement('div');
        tabBar.className = 'legal-tabs';
        card.appendChild(tabBar);

        const contentPanels = [];

        pages.forEach((page, i) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'legal-tab-btn' + (i === 0 ? ' active' : '');
            tabBtn.type = 'button';
            tabBtn.textContent = page.label;
            tabBar.appendChild(tabBtn);

            const panel = document.createElement('div');
            panel.className = 'legal-tab-content' + (i === 0 ? ' active' : '');
            panel.innerHTML = page.content;
            card.appendChild(panel);
            contentPanels.push(panel);

            tabBtn.addEventListener('click', () => {
                tabBar.querySelectorAll('.legal-tab-btn').forEach(b => b.classList.remove('active'));
                contentPanels.forEach(p => p.classList.remove('active'));
                tabBtn.classList.add('active');
                panel.classList.add('active');
                this._analytics.trackEvent(`event/legal/tab/${page.id}`, `Legal tab ${page.id}`);
            });
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        this._legalOverlay = overlay;
    }

    _toggleLegalOverlay() {
        if (!this._legalOverlay) return;
        if (!this._legalOverlay.classList.contains('open') && this._helpOverlay) {
            this._helpOverlay.classList.remove('open');
        }
        this._legalOverlay.classList.toggle('open');
    }

    _initKeyboardShortcuts() {
        const shortcuts = this._shortcuts;

        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            const match = shortcuts.find(s =>
                s.matchRaw ? e.key === s.key : e.key.toLowerCase() === s.key
            );
            if (!match) return;

            if (match.event) {
                this._analytics.trackEvent(match.event, match.eventLabel);
            }
            if (match.action) {
                match.action(e);
            }
        });
    }

    _initResizeHandle() {
        const panel = this._detailPanel.getPanel();
        const resizeHandle = this._detailPanel.getResizeHandle();
        const map = this._map;
        const MIN_PANEL_WIDTH = 340;
        const MAX_PANEL_WIDTH = 700;

        resizeHandle.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 600) return;
            e.preventDefault();
            panel.classList.add('resizing');
            const startX = e.clientX;
            const startWidth = panel.offsetWidth;

            function onMouseMove(e) {
                const delta = startX - e.clientX;
                const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + delta));
                panel.style.width = newWidth + 'px';
                map.invalidateSize();
            }

            function onMouseUp() {
                panel.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    _initDetailBuilders() {
        const self = this;
        const styles = this._config.styles || {};
        const allLayerDefs = this._allLayerDefs;

        const helpers = {
            buildDetail: (title, layerId, groups) => _buildDetail(title, layerId, groups, styles, allLayerDefs),
            buildReverseLinksSection: (data, label) => _buildReverseLinksSection(data, label, allLayerDefs),
            sourceRow,
            getReverseLinks: () => self._reverseLinks,
            eachLayerFeature: (layerId, cb) => self.eachLayerFeature(layerId, cb),
            getLayerLabel: (layerId) => {
                const def = allLayerDefs.find(d => d.id === layerId);
                return def ? def.label : layerId;
            },
            findLayerByProperty: (lid, fn) => self.findLayerByProperty(lid, fn),
            findLayerByIndex: (lid, idx) => self.findLayerByIndex(lid, idx),
            findFeatureIndex: (lid, lyr) => self.findFeatureIndex(lid, lyr),
        };

        const buildersFn = this._config.detailBuilders;
        this._detailBuilders = buildersFn ? buildersFn(helpers) : {};
    }

    // --- Mask layer ---

    _createMaskLayer(coordinates) {
        const cfg = this._config.maskLayer || {};
        const world = [
            [-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]
        ];
        const holeLatLng = coordinates[0].map(c => [c[1], c[0]]);
        const paneName = this._config.panes && Object.keys(this._config.panes).find(
            p => this._config.panes[p].pointerEvents === 'none'
        );
        return L.polygon([world, holeLatLng], {
            color: 'none',
            fillColor: cfg.fillColor || '#000',
            fillOpacity: cfg.fillOpacity !== undefined ? cfg.fillOpacity : 0.3,
            stroke: false,
            interactive: false,
            ...(paneName ? { pane: paneName } : {})
        });
    }

    // --- Data loading ---

    _loadData() {
        // Load reverse links
        if (this._config.reverseLinksUrl) {
            fetch(this._config.reverseLinksUrl)
                .then(r => r.ok ? r.json() : null)
                .then(data => { this._reverseLinks = data; })
                .catch(() => { /* reverse links unavailable */ });
        }

        const styles = this._config.styles || {};
        const patterns = this._config.patterns || {};
        const tooltips = this._config.tooltips || {};
        const layerPanes = this._config.layerPanes || {};
        const borderClickLayers = this._config.borderClickLayers || {};
        const maskLayerSourceId = this._config.maskLayer ? this._config.maskLayer.sourceLayerId : null;

        for (const def of this._allLayerDefs) {
            fetch(def.file)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(geojson => {
                    this._processLayer(def, geojson, styles, patterns, tooltips, layerPanes, borderClickLayers, maskLayerSourceId);
                    this._onLayerLoaded();
                })
                .catch(err => {
                    console.warn(`Failed to load ${def.file}:`, err);
                    this._onLayerLoaded();
                });
        }
    }

    _bindFeatureEvents(interactionLayer, visualLayer, def, feature, geojson, styles, tooltips, isContextLayer) {
        const builder = this._detailBuilders[def.id];
        if (builder) {
            interactionLayer.on('click', e => {
                L.DomEvent.stopPropagation(e);
                const idx = geojson.features.indexOf(feature);
                this._analytics.trackEvent('event/feature', 'Feature click');
                this._detailPanel.setSelectedFeatureInfo({ layerId: def.id, featureIndex: idx });
                this.showDetail(builder(feature.properties));
                this.updateHash();
            });
        }

        const ttFn = tooltips[def.id];
        if (ttFn) {
            const text = ttFn(feature.properties);
            if (text) {
                interactionLayer.bindTooltip(text, {
                    className: 'feature-tooltip',
                    sticky: true,
                    direction: 'top',
                    offset: [0, -10]
                });
            }
        }

        interactionLayer.on('mouseover', () => {
            if (this._hoveredLayer && this._hoveredLayer !== visualLayer && this._hoveredLayer.setStyle) {
                this._hoveredLayer.setStyle(styles[this._hoveredLayerId || def.id]);
            }
            this._hoveredLayer = visualLayer;
            this._hoveredLayerId = def.id;
            if (visualLayer.setStyle) {
                visualLayer.setStyle(getHoverStyle(def.id, styles));
            }
            if (visualLayer.bringToFront && !isContextLayer) {
                visualLayer.bringToFront();
            }
        });
        interactionLayer.on('mouseout', () => {
            if (visualLayer.setStyle) {
                visualLayer.setStyle(styles[def.id]);
            }
            this._hoveredLayer = null;
            this._hoveredLayerId = null;
        });
    }

    _processLayer(def, geojson, styles, patterns, tooltips, layerPanes, borderClickLayers, maskLayerSourceId) {
        const paneOpt = layerPanes[def.id] ? { pane: layerPanes[def.id] } : {};
        const hasBorderClick = !!borderClickLayers[def.id];
        const isContextLayer = this._contextLayerIds.has(def.id);

        const layerOpts = {
            ...(hasBorderClick ? { interactive: false } : {}),
            style: () => ({
                ...styles[def.id],
                ...paneOpt,
                ...(patterns[def.id] ? { className: `layer-${def.id}` } : {})
            }),
            onEachFeature: (feature, layer) => {
                if (!hasBorderClick) {
                    this._bindFeatureEvents(layer, layer, def, feature, geojson, styles, tooltips, isContextLayer);
                }
            }
        };

        if (styles[def.id] && styles[def.id].radius) {
            layerOpts.pointToLayer = (_feature, latlng) => L.circleMarker(latlng, { ...styles[def.id], ...paneOpt });
        }

        const layer = L.geoJSON(geojson, layerOpts);
        def._leafletLayer = layer;
        def._featureCount = geojson.features ? geojson.features.length : 0;

        // Border click layer
        if (borderClickLayers[def.id]) {
            const clickPane = borderClickLayers[def.id];
            const clickLayer = L.geoJSON(geojson, {
                style: () => ({
                    weight: 12,
                    color: 'transparent',
                    fill: false,
                    pane: clickPane
                }),
                onEachFeature: (feature, lyr) => {
                    const idx = geojson.features.indexOf(feature);
                    const visualFeature = def._leafletLayer.getLayers()[idx];
                    this._bindFeatureEvents(lyr, visualFeature, def, feature, geojson, styles, tooltips, isContextLayer);
                }
            });
            def._clickLayer = clickLayer;
        }

        // Mask layer
        if (maskLayerSourceId && def.id === maskLayerSourceId && geojson.features && geojson.features[0]) {
            this._mask = this._createMaskLayer(geojson.features[0].geometry.coordinates);
            if (def.active !== false) {
                this._mask.addTo(this._map);
            }
        }

        // Add to map if active
        if (def.active !== false) {
            layer.addTo(this._map);
            if (def._clickLayer) def._clickLayer.addTo(this._map);
        }
    }

    _onLayerLoaded() {
        this._loadedCount++;
        if (this._loadedCount < this._allLayerDefs.length) return;

        const styles = this._config.styles || {};
        const patterns = this._config.patterns || {};
        const searchableProps = this._config.searchableProps || {};

        // Update layer counts
        for (const d of this._allLayerDefs) {
            if (d._featureCount !== undefined) {
                this._layersDrawer.updateCount(d.id, d._featureCount);
            }
        }

        // Build search index
        this._buildSearchIndex(searchableProps);

        // Inject patterns
        injectPatterns(styles, patterns);
        injectPatternCSS(patterns);

        // Apply initial hash state
        this._applyInitialState();

        // Track page view
        this._analytics.trackPageView();

        // Listen for map moves
        this._map.on('moveend', () => this.updateHash());

        // Pattern re-injection on layer add
        this._map.on('layeradd', () => injectPatterns(styles, patterns));

        // Fade out loading overlay
        if (this._loadingOverlay) {
            this._loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                this._loadingOverlay.style.display = 'none';
                this._map.invalidateSize();
            }, 400);
        }

        // Call onReady callback
        if (this._config.onReady) {
            this._config.onReady(this);
        }
    }

    _buildSearchIndex(searchableProps) {
        for (const def of this._allLayerDefs) {
            if (!def._leafletLayer) continue;
            const config = searchableProps[def.id];
            if (!config) continue;
            def._leafletLayer.eachLayer(layer => {
                const props = layer.feature.properties;
                const title = config.title(props) || '';
                if (!title) return;
                const searchText = config.text
                    .map(key => props[key] ? String(props[key]) : '')
                    .join(' ')
                    .toLowerCase();
                this._searchIndex.push({
                    title,
                    meta: config.meta(props),
                    searchText,
                    layer,
                    layerId: def.id,
                    def
                });
            });
        }
    }

    _applyInitialState() {
        const state = this._initialHashState;

        if (state) {
            if (state.layers) {
                for (const def of this._allLayerDefs) {
                    const shouldBeActive = state.layers.includes(def.id);
                    this._setLayerVisibility(def, shouldBeActive);
                }
            }

            if (state.base && this._baseLayers[state.base]) {
                for (const name of Object.keys(this._baseLayers)) {
                    this._map.removeLayer(this._baseLayers[name]);
                }
                this._baseLayers[state.base].addTo(this._map);
                this._syncBaseLayerCards(state.base);
            }

            if (state.lat !== undefined) {
                this._map.setView([state.lat, state.lng], state.zoom);
            } else {
                this.fitBounds();
            }

            if (state.sel) {
                const { layerId, featureIndex } = state.sel;
                this.ensureLayerVisible(layerId);
                const found = this.findLayerByIndex(layerId, featureIndex);
                if (found) {
                    const builder = this._detailBuilders[layerId];
                    if (builder) {
                        this._detailPanel.setSelectedFeatureInfo({ layerId, featureIndex });
                        this.showDetail(builder(found.feature.properties));
                    }
                }
            }
        } else {
            this.fitBounds();
        }
    }

    // --- Layer visibility ---

    ensureLayerVisible(layerId) {
        const def = this._allLayerDefs.find(d => d.id === layerId);
        if (!def || !def._leafletLayer) return;
        if (!this._map.hasLayer(def._leafletLayer)) {
            def._leafletLayer.addTo(this._map);
            if (def._clickLayer) def._clickLayer.addTo(this._map);
            const maskSourceId = this._config.maskLayer ? this._config.maskLayer.sourceLayerId : null;
            if (layerId === maskSourceId && this._mask) this._mask.addTo(this._map);
            this._layersDrawer.syncLayerState(layerId, true);
        }
    }

    _setLayerVisibility(def, active) {
        if (!def._leafletLayer) return;
        const isActive = this._map.hasLayer(def._leafletLayer);
        const maskSourceId = this._config.maskLayer ? this._config.maskLayer.sourceLayerId : null;
        if (active && !isActive) {
            def._leafletLayer.addTo(this._map);
            if (def._clickLayer) def._clickLayer.addTo(this._map);
            if (def.id === maskSourceId && this._mask) this._mask.addTo(this._map);
        } else if (!active && isActive) {
            this._map.removeLayer(def._leafletLayer);
            if (def._clickLayer) this._map.removeLayer(def._clickLayer);
            if (def.id === maskSourceId && this._mask) this._map.removeLayer(this._mask);
        }
        this._layersDrawer.syncLayerState(def.id, active);
    }

    _syncBaseLayerCards(targetName) {
        const cards = document.querySelectorAll('.drawer-base-card');
        cards.forEach(c => {
            const label = c.querySelector('.drawer-base-card-label');
            const isMatch = label && label.textContent === targetName;
            c.classList.toggle('active', isMatch);
            c.setAttribute('aria-pressed', isMatch);
        });
    }

    _resetToDefaults() {
        this.hideDetail();

        if (this._layersDrawer && this._layersDrawer.isOpen()) this._layersDrawer.close();

        for (const def of this._allLayerDefs) {
            const shouldBeActive = def.active !== false;
            this._setLayerVisibility(def, shouldBeActive);
        }

        const defaultName = this._config.defaultBaseLayer || Object.keys(this._baseLayers)[0];
        for (const name of Object.keys(this._baseLayers)) {
            this._map.removeLayer(this._baseLayers[name]);
        }
        if (this._baseLayers[defaultName]) {
            this._baseLayers[defaultName].addTo(this._map);
        }
        this._syncBaseLayerCards(defaultName);

        this.fitBounds();

        history.replaceState(null, '', location.pathname + location.search);
    }

    // --- Public API ---

    getMap() {
        return this._map;
    }

    showDetail(html) {
        this._detailPanel.show(html, this._map, this._layersDrawer);
    }

    hideDetail() {
        this._detailPanel.hide(this._map);
    }

    showFeatureDetail(layerId, featureIndex, properties) {
        const builder = this._detailBuilders[layerId];
        if (!builder) return;
        let props = properties;
        if (!props) {
            const lyr = this.findLayerByIndex(layerId, featureIndex);
            props = lyr ? lyr.feature.properties : null;
        }
        if (!props) return;
        this._detailPanel.setSelectedFeatureInfo({ layerId, featureIndex });
        this.showDetail(builder(props));
        this.updateHash();
    }

    getDetailBuilder(layerId) {
        return this._detailBuilders[layerId];
    }

    findLayerByProperty(layerId, matchFn) {
        const def = this._allLayerDefs.find(d => d.id === layerId);
        if (!def || !def._leafletLayer) return null;
        let found = null;
        def._leafletLayer.eachLayer(lyr => {
            if (!found && matchFn(lyr.feature.properties, lyr)) {
                found = lyr;
            }
        });
        return found;
    }

    findLayerByIndex(layerId, index) {
        const def = this._allLayerDefs.find(d => d.id === layerId);
        if (!def || !def._leafletLayer) return null;
        let found = null;
        let idx = 0;
        def._leafletLayer.eachLayer(lyr => {
            if (idx === index) found = lyr;
            idx++;
        });
        return found;
    }

    findFeatureIndex(layerId, targetLayer) {
        const def = this._allLayerDefs.find(d => d.id === layerId);
        if (!def || !def._leafletLayer) return -1;
        let idx = 0;
        let found = -1;
        def._leafletLayer.eachLayer(lyr => {
            if (lyr === targetLayer) found = idx;
            idx++;
        });
        return found;
    }

    eachLayerFeature(layerId, callback) {
        const def = this._allLayerDefs.find(d => d.id === layerId);
        if (!def || !def._leafletLayer) return;
        def._leafletLayer.eachLayer(callback);
    }

    highlightFeature(layer, layerId, opts) {
        _highlightFeature(layer, layerId, this._config.styles || {}, opts);
    }

    fitBounds() {
        const boundsLayerId = this._config.boundsLayerId;
        if (boundsLayerId) {
            const def = this._allLayerDefs.find(d => d.id === boundsLayerId);
            if (def && def._leafletLayer) {
                this._map.fitBounds(def._leafletLayer.getBounds(), { paddingTopLeft: [20, 80], paddingBottomRight: [20, 20] });
                return;
            }
        }
        const fallback = this._config.boundsFallback || this._config.map || {};
        this._map.setView(fallback.center || [0, 0], fallback.zoom || 2);
    }

    updateHash() {
        const hash = buildHash({
            allLayerDefs: this._allLayerDefs,
            map: this._map,
            baseLayers: this._baseLayers,
            defaultBaseLayer: this._config.defaultBaseLayer || Object.keys(this._baseLayers)[0],
            selectedFeatureInfo: this._detailPanel.getSelectedFeatureInfo()
        });
        history.replaceState(null, '', '#' + hash);
    }

    getLayersDrawer() {
        return this._layersDrawer;
    }

    getAllLayerDefs() {
        return this._allLayerDefs;
    }
}
