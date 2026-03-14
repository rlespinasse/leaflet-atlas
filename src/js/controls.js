// --- Leaflet UI controls ---

import L from 'leaflet';
import { setToggleState, escapeHtml, getHoverStyle, normalizeText } from './helpers.js';
import { buildPatternContent } from './patterns.js';

// --- Legend swatch ---

export function getLayerGeomType(layerId, styles, geometryTypes) {
    if (geometryTypes && geometryTypes[layerId]) return geometryTypes[layerId];
    if (styles[layerId] && styles[layerId].radius) return 'point';
    return 'polygon';
}

export function createSwatch(layerId, styles, patterns, geometryTypes) {
    const style = styles[layerId];
    if (!style) return document.createElement('span');
    const geom = getLayerGeomType(layerId, styles, geometryTypes);
    const color = style.fillColor || style.color;
    const swatch = document.createElement('span');
    swatch.className = 'layer-swatch';

    if (geom === 'point') {
        swatch.classList.add('layer-swatch-point');
        swatch.style.background = color;
        swatch.style.border = `1.5px solid ${style.color}`;
    } else if (geom === 'line') {
        swatch.classList.add('layer-swatch-line');
        swatch.style.background = style.dashArray
            ? `repeating-linear-gradient(90deg, ${style.color} 0, ${style.color} 4px, transparent 4px, transparent 7px)`
            : style.color;
    } else if (patterns[layerId]) {
        swatch.classList.add('layer-swatch-polygon');
        const W = 20, H = 12, B = 1.5;
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.style.display = 'block';
        const bgRect = document.createElementNS(NS, 'rect');
        bgRect.setAttribute('x', B); bgRect.setAttribute('y', B);
        bgRect.setAttribute('width', W - B * 2); bgRect.setAttribute('height', H - B * 2);
        bgRect.setAttribute('fill', color);
        bgRect.setAttribute('fill-opacity', Math.max(style.fillOpacity || 0.3, 0.4));
        svg.appendChild(bgRect);
        const defs = document.createElementNS(NS, 'defs');
        const cfg = patterns[layerId];
        const pat = document.createElementNS(NS, 'pattern');
        const patId = `swatch-pattern-${layerId}`;
        pat.setAttribute('id', patId);
        pat.setAttribute('patternUnits', 'userSpaceOnUse');
        pat.setAttribute('width', cfg.size);
        pat.setAttribute('height', cfg.size);
        buildPatternContent(pat, cfg, color);
        defs.appendChild(pat);
        svg.appendChild(defs);
        const patRect = document.createElementNS(NS, 'rect');
        patRect.setAttribute('x', B); patRect.setAttribute('y', B);
        patRect.setAttribute('width', W - B * 2); patRect.setAttribute('height', H - B * 2);
        patRect.setAttribute('fill', `url(#${patId})`);
        svg.appendChild(patRect);
        const borderRect = document.createElementNS(NS, 'rect');
        borderRect.setAttribute('x', B / 2); borderRect.setAttribute('y', B / 2);
        borderRect.setAttribute('width', W - B); borderRect.setAttribute('height', H - B);
        borderRect.setAttribute('rx', 2);
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', style.color);
        borderRect.setAttribute('stroke-width', B);
        if (style.dashArray) borderRect.setAttribute('stroke-dasharray', style.dashArray);
        svg.appendChild(borderRect);
        swatch.appendChild(svg);
    } else {
        swatch.classList.add('layer-swatch-polygon');
        swatch.style.background = color;
        swatch.style.opacity = Math.max(style.fillOpacity || 0.3, 0.4);
        swatch.style.border = `1.5px solid ${style.color}`;
        if (style.dashArray) {
            swatch.style.borderStyle = 'dashed';
        }
    }
    return swatch;
}

// --- Layers Drawer ---

export function createLayersDrawer(layerGroupsDef, contextLayersDef, baseLayersDef, baseLayerThumbnails, {
    map, maskRef, hideDetail, updateHash, allLayerDefs, trackEvent, maskLayerSourceId, labels,
    styles: passedStyles, patterns: passedPatterns, geometryTypes: passedGeometryTypes
}) {
    const _labels = labels || {};
    const layersLabel = _labels.layers || 'Couches';
    const basemapLabel = _labels.basemap || 'Fond de carte';
    const closeLabel = _labels.close || 'Fermer';
    const layerScope = _labels.layerScope || 'la couche';
    const groupScope = _labels.groupScope || 'le groupe';

    const LayersDrawer = L.Control.extend({
        options: { position: 'topleft' },
        initialize: function (layerGroups, contextLayers, baseLayers, options) {
            L.Util.setOptions(this, options);
            this._layerGroups = layerGroups;
            this._contextLayers = contextLayers;
            this._baseLayers = baseLayers;
            this._countSpans = {};
            this._groupLists = [];
            this._layerToggleBtns = {};
            this._groupSyncs = [];
            this._styles = passedStyles;
            this._patterns = passedPatterns;
            this._geometryTypes = passedGeometryTypes;
        },
        onAdd: function () {
            const aside = L.DomUtil.create('aside', 'layers-drawer');
            L.DomEvent.disableClickPropagation(aside);
            L.DomEvent.disableScrollPropagation(aside);
            const self = this;
            this._aside = aside;

            L.DomUtil.create('div', 'drag-handle', aside);

            const header = L.DomUtil.create('div', 'layers-drawer-header', aside);
            const title = L.DomUtil.create('span', 'layers-drawer-title', header);
            title.textContent = layersLabel;
            const closeBtn = L.DomUtil.create('button', 'panel-close-btn', header);
            closeBtn.innerHTML = '&times;';
            closeBtn.title = closeLabel;
            closeBtn.setAttribute('aria-label', closeLabel);
            closeBtn.addEventListener('click', () => self.close());

            const tabBar = L.DomUtil.create('div', 'layers-drawer-tabs', aside);
            const tabCouches = L.DomUtil.create('button', 'layers-drawer-tab active', tabBar);
            tabCouches.type = 'button';
            tabCouches.textContent = layersLabel;
            const tabFond = L.DomUtil.create('button', 'layers-drawer-tab', tabBar);
            tabFond.type = 'button';
            tabFond.textContent = basemapLabel;

            const contentCouches = L.DomUtil.create('div', 'layers-drawer-tab-content active', aside);
            const contentFond = L.DomUtil.create('div', 'layers-drawer-tab-content', aside);


            tabCouches.addEventListener('click', () => {
                tabCouches.classList.add('active');
                tabFond.classList.remove('active');
                contentCouches.classList.add('active');
                contentFond.classList.remove('active');
            });
            tabFond.addEventListener('click', () => {
                tabFond.classList.add('active');
                tabCouches.classList.remove('active');
                contentFond.classList.add('active');
                contentCouches.classList.remove('active');
            });

            // Filter bar
            const filterBar = L.DomUtil.create('div', 'drawer-filter-bar', contentCouches);
            const filterInput = L.DomUtil.create('input', 'drawer-filter-input', filterBar);
            filterInput.type = 'text';
            filterInput.placeholder = 'Filtrer les couches...';
            filterInput.setAttribute('aria-label', 'Filtrer les couches');
            const filterClearBtn = L.DomUtil.create('button', 'drawer-filter-clear', filterBar);
            filterClearBtn.type = 'button';
            filterClearBtn.innerHTML = '&times;';
            filterClearBtn.title = 'Effacer le filtre';
            this._filterInput = filterInput;
            this._filterClearBtn = filterClearBtn;
            this._collapsedSnapshot = null;

            filterInput.addEventListener('input', () => {
                self._applyFilter(filterInput.value);
            });
            filterClearBtn.addEventListener('click', () => {
                filterInput.value = '';
                self._applyFilter('');
                filterInput.focus();
            });
            filterInput.addEventListener('keydown', e => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    filterInput.value = '';
                    self._applyFilter('');
                    filterInput.focus();
                }
            });

            this._buildGroupSection(contentCouches, 'Contexte', this._contextLayers, true);

            for (const g of this._layerGroups) {
                this._buildGroupSection(contentCouches, g.group, g.layers, false);
            }

            const cardList = L.DomUtil.create('div', 'drawer-base-cards', contentFond);
            const activeName = Object.keys(this._baseLayers).find(n =>
                self._map.hasLayer(self._baseLayers[n])
            ) || Object.keys(this._baseLayers)[0];

            const baseCards = [];
            for (const name of Object.keys(this._baseLayers)) {
                const card = L.DomUtil.create('button', 'drawer-base-card', cardList);
                const isActive = name === activeName;
                if (isActive) card.classList.add('active');
                card.type = 'button';
                card.setAttribute('aria-pressed', isActive);
                if (baseLayerThumbnails[name]) {
                    const thumb = L.DomUtil.create('img', 'drawer-base-card-thumb', card);
                    thumb.src = baseLayerThumbnails[name];
                    thumb.alt = name;
                    thumb.loading = 'lazy';
                }
                const cardLabel = L.DomUtil.create('span', 'drawer-base-card-label', card);
                cardLabel.textContent = name;
                baseCards.push(card);
                card.addEventListener('click', () => {
                    trackEvent('event/basemap', 'Base map change');
                    for (const n of Object.keys(self._baseLayers)) {
                        self._map.removeLayer(self._baseLayers[n]);
                    }
                    self._baseLayers[name].addTo(self._map);
                    for (const c of baseCards) {
                        c.classList.remove('active');
                        c.setAttribute('aria-pressed', 'false');
                    }
                    card.classList.add('active');
                    card.setAttribute('aria-pressed', 'true');
                    self._map.fire('baselayerchange', { name, layer: self._baseLayers[name] });
                    updateHash();
                });
            }

            this._map.getContainer().parentElement.appendChild(aside);
            const dummy = L.DomUtil.create('div');
            dummy.style.display = 'none';
            return dummy;
        },

        _buildGroupSection: function (container, groupLabel, layerDefs, isContext) {
            const self = this;
            const groupHeader = L.DomUtil.create('div', 'drawer-group-header', container);
            const toggleArrow = L.DomUtil.create('span', 'drawer-group-toggle', groupHeader);
            const groupSpan = L.DomUtil.create('span', 'drawer-group-label', groupHeader);
            groupSpan.textContent = isContext ? groupLabel : ` ${groupLabel}`;

            const activeCount = layerDefs.filter(d => d.active !== false).length;
            const allActive = activeCount === layerDefs.length;
            const someActive = activeCount > 0;
            const isPartial = someActive && !allActive;
            const groupToggleBtn = L.DomUtil.create('button', 'layer-toggle-btn' + (isContext ? '' : ' group-toggle-btn'), groupHeader);
            groupToggleBtn.type = 'button';
            setToggleState(groupToggleBtn, someActive, groupScope, isPartial);

            const groupList = L.DomUtil.create('div', 'drawer-group-list', container);
            const layerToggles = [];

            for (const def of layerDefs) {
                const toggleBtn = self._buildLayerRow(groupList, def, isContext);
                layerToggles.push({ toggleBtn, def });
            }

            function syncGroupToggle() {
                const activeCount = layerToggles.filter(lt => lt.toggleBtn.classList.contains('active')).length;
                const allActive = activeCount === layerToggles.length;
                const anyActive = activeCount > 0;
                const isPartial = anyActive && !allActive;
                setToggleState(groupToggleBtn, anyActive, groupScope, isPartial);
            }

            this._groupSyncs.push({ layerIds: layerDefs.map(d => d.id), sync: syncGroupToggle });

            for (const lt of layerToggles) {
                lt.toggleBtn.closest('.drawer-layer-row').addEventListener('click', () => {
                    setTimeout(syncGroupToggle, 0);
                });
            }

            groupToggleBtn.addEventListener('click', e => {
                e.stopPropagation();
                const nowActive = groupToggleBtn.classList.contains('active');
                for (const lt of layerToggles) {
                    const isLayerActive = lt.toggleBtn.classList.contains('active');
                    if (nowActive && isLayerActive) {
                        setToggleState(lt.toggleBtn, false, layerScope);
                        if (lt.def._leafletLayer) self._map.removeLayer(lt.def._leafletLayer);
                        if (lt.def._clickLayer) self._map.removeLayer(lt.def._clickLayer);
                        if (isContext && lt.def.id === maskLayerSourceId && maskRef()) {
                            self._map.removeLayer(maskRef());
                        }
                    } else if (!nowActive && !isLayerActive) {
                        setToggleState(lt.toggleBtn, true, layerScope);
                        if (lt.def._leafletLayer) lt.def._leafletLayer.addTo(self._map);
                        if (lt.def._clickLayer) lt.def._clickLayer.addTo(self._map);
                        if (isContext && lt.def.id === maskLayerSourceId && maskRef()) {
                            maskRef().addTo(self._map);
                        }
                    }
                }
                if (!nowActive && groupList.classList.contains('collapsed')) {
                    groupList.classList.remove('collapsed');
                    toggleArrow.classList.remove('collapsed');
                    groupList.style.maxHeight = `${groupList.scrollHeight}px`;
                }
                syncGroupToggle();
                self._updateToggleIndicator();
            });

            const isCollapsed = !someActive;
            if (isCollapsed) {
                groupList.classList.add('collapsed');
                toggleArrow.classList.add('collapsed');
            }
            this._groupLists.push(groupList);

            toggleArrow.addEventListener('click', e => {
                e.stopPropagation();
                if (groupList.classList.contains('collapsed')) {
                    groupList.classList.remove('collapsed');
                    toggleArrow.classList.remove('collapsed');
                    groupList.style.maxHeight = `${groupList.scrollHeight}px`;
                } else {
                    groupList.style.maxHeight = `${groupList.scrollHeight}px`;
                    groupList.offsetHeight; // force reflow
                    groupList.classList.add('collapsed');
                    toggleArrow.classList.add('collapsed');
                }
            });
        },

        _buildLayerRow: function (container, def, isContext) {
            const self = this;
            const styles = self._styles;
            const patterns = self._patterns;
            const geometryTypes = self._geometryTypes;
            const row = L.DomUtil.create('div', 'drawer-layer-row', container);
            const color = styles[def.id] ? (styles[def.id].fillColor || styles[def.id].color) : '#888';
            row.style.setProperty('--layer-color', color);

            row.appendChild(createSwatch(def.id, styles, patterns, geometryTypes));

            const label = L.DomUtil.create('span', 'drawer-layer-label', row);
            label.textContent = def.label;

            const countSpan = L.DomUtil.create('span', 'drawer-layer-count', row);
            self._countSpans[def.id] = countSpan;

            const isActive = def.active !== false;
            const toggleBtn = L.DomUtil.create('button', 'layer-toggle-btn', row);
            toggleBtn.type = 'button';
            setToggleState(toggleBtn, isActive, layerScope);

            self._layerToggleBtns[def.id] = toggleBtn;

            row.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const nowActive = toggleBtn.classList.contains('active');
                trackEvent('event/layer-toggle', 'Layer toggle');
                setToggleState(toggleBtn, !nowActive, layerScope);
                if (nowActive) {
                    if (def._leafletLayer) self._map.removeLayer(def._leafletLayer);
                    if (def._clickLayer) self._map.removeLayer(def._clickLayer);
                    if (isContext && def.id === maskLayerSourceId && maskRef()) {
                        self._map.removeLayer(maskRef());
                    }
                } else {
                    if (def._leafletLayer) def._leafletLayer.addTo(self._map);
                    if (def._clickLayer) def._clickLayer.addTo(self._map);
                    if (isContext && def.id === maskLayerSourceId && maskRef()) {
                        maskRef().addTo(self._map);
                    }
                }
                self._updateToggleIndicator();
                updateHash();
            });

            return toggleBtn;
        },
        open: function () {
            this._aside.classList.add('open');
            const self = this;
            requestAnimationFrame(() => {
                for (const gl of self._groupLists) {
                    if (!gl.classList.contains('collapsed')) {
                        gl.style.maxHeight = `${gl.scrollHeight}px`;
                    }
                }
            });
            if (window.innerWidth <= 600) {
                hideDetail();
            }
            this._map.invalidateSize();
        },
        close: function () {
            this._aside.classList.remove('open');
            this._map.invalidateSize();
        },
        toggle: function () {
            if (this._aside.classList.contains('open')) {
                this.close();
            } else {
                this.open();
            }
        },
        isOpen: function () {
            return this._aside.classList.contains('open');
        },
        focusFilter: function () {
            if (!this.isOpen()) this.open();
            if (this._filterInput) this._filterInput.focus();
        },
        updateCount: function (layerId, count) {
            if (this._countSpans[layerId]) {
                this._countSpans[layerId].textContent = count;
            }
        },
        syncLayerState: function (layerId, active) {
            const btn = this._layerToggleBtns[layerId];
            if (btn) setToggleState(btn, active, layerScope);
            for (const gs of this._groupSyncs) {
                if (gs.layerIds.includes(layerId)) gs.sync();
            }
            this._updateToggleIndicator();
        },
        _toggleBtn: null,
        _updateToggleIndicator: function () {
            if (!this._toggleBtn) return;
            let hasNonDefault = false;
            for (const g of this._layerGroups) {
                for (const def of g.layers) {
                    if (!def._leafletLayer) continue;
                    const isOnMap = map.hasLayer(def._leafletLayer);
                    const wasDefault = def.active !== false;
                    if (isOnMap !== wasDefault) hasNonDefault = true;
                }
            }
            for (const def of this._contextLayers) {
                if (!def._leafletLayer) continue;
                const isOnMap = map.hasLayer(def._leafletLayer);
                const wasDefault = def.active !== false;
                if (isOnMap !== wasDefault) hasNonDefault = true;
            }
            this._toggleBtn.classList.toggle('has-active', hasNonDefault);
        },
        _applyFilter: function (rawQuery) {
            const query = normalizeText(rawQuery.trim());
            const hasQuery = query.length > 0;

            // Toggle clear button visibility
            this._filterClearBtn.classList.toggle('visible', hasQuery);

            // Snapshot collapsed state on first filter keystroke
            if (hasQuery && !this._collapsedSnapshot) {
                trackEvent('event/layer-filter', 'Layer filter');
                this._collapsedSnapshot = new Map();
                for (const gl of this._groupLists) {
                    this._collapsedSnapshot.set(gl, gl.classList.contains('collapsed'));
                }
            }

            for (const gl of this._groupLists) {
                const header = gl.previousElementSibling; // .drawer-group-header
                const rows = gl.querySelectorAll('.drawer-layer-row');
                let matchCount = 0;

                for (const row of rows) {
                    const label = row.querySelector('.drawer-layer-label');
                    if (!label) continue;
                    const text = normalizeText(label.textContent);
                    const matches = !hasQuery || text.includes(query);
                    row.style.display = matches ? '' : 'none';
                    if (matches) matchCount++;
                }

                if (hasQuery) {
                    const visible = matchCount > 0;
                    header.style.display = visible ? '' : 'none';
                    gl.style.display = visible ? '' : 'none';
                    if (visible) {
                        gl.classList.remove('collapsed');
                        if (header) {
                            const arrow = header.querySelector('.drawer-group-toggle');
                            if (arrow) arrow.classList.remove('collapsed');
                        }
                        gl.style.maxHeight = `${gl.scrollHeight}px`;
                    }
                } else {
                    header.style.display = '';
                    gl.style.display = '';
                }
            }

            // Restore collapsed state when filter is cleared
            if (!hasQuery && this._collapsedSnapshot) {
                for (const [gl, wasCollapsed] of this._collapsedSnapshot) {
                    const header = gl.previousElementSibling;
                    const arrow = header ? header.querySelector('.drawer-group-toggle') : null;
                    if (wasCollapsed) {
                        gl.classList.add('collapsed');
                        if (arrow) arrow.classList.add('collapsed');
                    } else {
                        gl.classList.remove('collapsed');
                        if (arrow) arrow.classList.remove('collapsed');
                        gl.style.maxHeight = `${gl.scrollHeight}px`;
                    }
                }
                this._collapsedSnapshot = null;
            }
        }
    });

    const drawer = new LayersDrawer(layerGroupsDef, contextLayersDef, baseLayersDef);
    return drawer;
}

// --- Search Control ---

export function createSearchControl({
    map, styles, searchIndex, allLayerDefs, detailBuilders,
    ensureLayerVisible, showDetail, updateHash, findFeatureIndex,
    setSelectedFeatureInfo, searchInputRef, trackEvent, labels, noBringToFrontLayers
}) {
    const _labels = labels || {};
    const searchPlaceholder = _labels.searchPlaceholder || 'Rechercher un lieu...';
    const searchLabel = _labels.searchLabel || 'Rechercher';
    const searchClearTitle = _labels.searchClear || 'Effacer';
    const searchClearLabel = _labels.searchClearLabel || 'Effacer la recherche';
    const noResultsText = _labels.noResults || 'Aucun resultat';
    const noBringToFront = noBringToFrontLayers || new Set();

    const SearchControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'search-control');
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const inputWrapper = L.DomUtil.create('div', 'search-input-wrapper', container);
            const input = L.DomUtil.create('input', '', inputWrapper);
            input.type = 'text';
            input.placeholder = searchPlaceholder;
            input.setAttribute('aria-label', searchLabel);
            searchInputRef(input);

            const clearBtn = L.DomUtil.create('button', 'search-clear', inputWrapper);
            clearBtn.type = 'button';
            clearBtn.innerHTML = '&times;';
            clearBtn.title = searchClearTitle;
            clearBtn.setAttribute('aria-label', searchClearLabel);

            const results = L.DomUtil.create('div', 'search-results', container);
            let activeIndex = -1;
            let previewLayer = null;
            let previewLayerId = null;
            let currentResults = [];

            function previewHighlight(item) {
                previewUnhighlight();
                if (!item || !item.layer) return;
                previewLayer = item.layer;
                previewLayerId = item.layerId;
                if (previewLayer.setStyle) {
                    previewLayer.setStyle(getHoverStyle(item.layerId, styles));
                    if (previewLayer.bringToFront && !noBringToFront.has(item.layerId)) {
                        previewLayer.bringToFront();
                    }
                }
                if (previewLayer.getTooltip && previewLayer.getTooltip()) {
                    previewLayer.openTooltip();
                }
            }

            function previewUnhighlight() {
                if (!previewLayer) return;
                if (previewLayer.setStyle && previewLayerId) {
                    previewLayer.setStyle(styles[previewLayerId]);
                }
                if (previewLayer.getTooltip && previewLayer.getTooltip()) {
                    previewLayer.closeTooltip();
                }
                previewLayer = null;
                previewLayerId = null;
            }

            function updateClearBtn() {
                if (input.value.length > 0) {
                    clearBtn.classList.add('visible');
                    input.classList.add('expanded');
                } else {
                    clearBtn.classList.remove('visible');
                }
            }

            input.addEventListener('focus', () => input.classList.add('expanded'));
            input.addEventListener('blur', () => {
                if (input.value.length === 0) {
                    input.classList.remove('expanded');
                }
            });

            function clearResults() {
                previewUnhighlight();
                results.innerHTML = '';
                results.classList.remove('open');
                activeIndex = -1;
                currentResults = [];
            }

            function showResults(items) {
                results.innerHTML = '';
                activeIndex = -1;
                currentResults = items;
                if (items.length === 0) {
                    if (input.value.trim().length >= 2) {
                        results.innerHTML = `<div class="search-no-results">${escapeHtml(noResultsText)}</div>`;
                        results.classList.add('open');
                    } else {
                        results.classList.remove('open');
                    }
                    return;
                }
                items.forEach((item, idx) => {
                    const div = L.DomUtil.create('div', 'search-result-item', results);
                    const titleDiv = L.DomUtil.create('div', 'search-result-title', div);
                    const layerDot = L.DomUtil.create('span', 'search-result-layer', titleDiv);
                    const color = styles[item.layerId] ? (styles[item.layerId].fillColor || styles[item.layerId].color) : '#888';
                    layerDot.style.background = color;
                    const titleText = document.createTextNode(item.title);
                    titleDiv.appendChild(titleText);
                    const metaDiv = L.DomUtil.create('div', 'search-result-meta', div);
                    metaDiv.textContent = item.meta;
                    div.addEventListener('click', () => selectResult(item));
                    div.addEventListener('mouseenter', () => {
                        setActive(idx);
                        previewHighlight(item);
                    });
                    div.addEventListener('mouseleave', () => previewUnhighlight());
                });
                results.classList.add('open');
            }

            function setActive(idx) {
                const items = results.querySelectorAll('.search-result-item');
                for (const el of items) el.classList.remove('active');
                activeIndex = idx;
                if (idx >= 0 && idx < items.length) {
                    items[idx].classList.add('active');
                    items[idx].scrollIntoView({ block: 'nearest' });
                }
            }

            function selectResult(item) {
                trackEvent('event/search', 'Search');
                clearResults();
                input.value = item.title;
                updateClearBtn();

                ensureLayerVisible(item.layerId);

                if (item.layer.getBounds) {
                    map.fitBounds(item.layer.getBounds(), { padding: [50, 50], maxZoom: 16 });
                } else if (item.layer.getLatLng) {
                    map.setView(item.layer.getLatLng(), 16);
                }

                const builder = detailBuilders[item.layerId];
                if (builder) {
                    setSelectedFeatureInfo({ layerId: item.layerId, featureIndex: findFeatureIndex(item.layerId, item.layer) });
                    showDetail(builder(item.layer.feature.properties));
                    updateHash();
                }

                if (item.layer.setStyle) {
                    const origStyle = styles[item.layerId];
                    item.layer.setStyle({ weight: 4, fillOpacity: 0.6 });
                    setTimeout(() => item.layer.setStyle(origStyle), 2000);
                }

                input.blur();
            }

            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearResults();
                updateClearBtn();
                input.focus();
            });

            let debounceTimer;
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                updateClearBtn();
                const query = input.value.trim().toLowerCase();
                if (query.length < 2) {
                    clearResults();
                    return;
                }
                debounceTimer = setTimeout(() => {
                    const terms = query.split(/\s+/);
                    const matches = searchIndex.filter(entry =>
                        terms.every(term =>
                            entry.searchText.includes(term) || entry.title.toLowerCase().includes(term)
                        )
                    ).slice(0, 20);
                    showResults(matches);
                }, 150);
            });

            input.addEventListener('keydown', e => {
                const items = results.querySelectorAll('.search-result-item');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive(Math.min(activeIndex + 1, items.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive(Math.max(activeIndex - 1, 0));
                } else if (e.key === 'Enter' && activeIndex >= 0) {
                    e.preventDefault();
                    if (currentResults[activeIndex]) {
                        selectResult(currentResults[activeIndex]);
                    }
                } else if (e.key === 'Escape') {
                    clearResults();
                    input.blur();
                }
            });

            map.on('click', () => clearResults());

            return container;
        }
    });

    return SearchControl;
}

// --- Bottom Bar Control ---

export function createBottomBarControl({
    map, layersDrawer, toggleHelpOverlay, toggleLegalOverlay, hideDetail, resetToDefaults, fitBounds,
    SearchControl, trackEvent, labels
}) {
    const _labels = labels || {};
    const layersLabel = _labels.layers || 'Couches';
    const zoomInLabel = _labels.zoomIn || 'Zoom avant';
    const zoomOutLabel = _labels.zoomOut || 'Zoom arri\u00e8re';
    const fullExtentLabel = _labels.fullExtent || 'Vue d\'ensemble';
    const resetViewLabel = _labels.resetView || 'R\u00e9initialiser la vue';
    const shortcutsLabel = _labels.shortcuts || 'Raccourcis clavier';
    const legalLabel = _labels.legal || 'Mentions légales';

    const BottomBarControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'bottom-pickers-bar');
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const layersBtn = L.DomUtil.create('button', 'layers-toggle-btn', container);
            layersBtn.type = 'button';
            layersBtn.title = layersLabel;
            layersBtn.setAttribute('aria-label', layersLabel);
            layersBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
            layersBtn.addEventListener('click', () => {
                trackEvent('event/drawer', 'Layers drawer');
                layersDrawer.toggle();
            });
            layersDrawer._toggleBtn = layersBtn;

            const sc = new SearchControl();
            sc._map = map;
            container.appendChild(sc.onAdd(map));

            const zoomBar = L.DomUtil.create('div', 'leaflet-bar leaflet-control-zoom unified-zoom', container);

            const zoomIn = L.DomUtil.create('a', 'leaflet-control-zoom-in', zoomBar);
            zoomIn.href = '#';
            zoomIn.title = zoomInLabel;
            zoomIn.setAttribute('role', 'button');
            zoomIn.setAttribute('aria-label', zoomInLabel);
            zoomIn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

            const fullExtent = L.DomUtil.create('a', 'leaflet-control-full-extent', zoomBar);
            fullExtent.href = '#';
            fullExtent.title = fullExtentLabel;
            fullExtent.setAttribute('role', 'button');
            fullExtent.setAttribute('aria-label', fullExtentLabel);
            fullExtent.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

            const resetView = L.DomUtil.create('a', 'leaflet-control-reset-view', zoomBar);
            resetView.href = '#';
            resetView.title = resetViewLabel;
            resetView.setAttribute('role', 'button');
            resetView.setAttribute('aria-label', resetViewLabel);
            resetView.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';

            const zoomOut = L.DomUtil.create('a', 'leaflet-control-zoom-out', zoomBar);
            zoomOut.href = '#';
            zoomOut.title = zoomOutLabel;
            zoomOut.setAttribute('role', 'button');
            zoomOut.setAttribute('aria-label', zoomOutLabel);
            zoomOut.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

            L.DomEvent.on(zoomIn, 'click', e => {
                L.DomEvent.preventDefault(e);
                trackEvent('event/zoom/in', 'Zoom in');
                map.zoomIn();
            });
            L.DomEvent.on(fullExtent, 'click', e => {
                L.DomEvent.preventDefault(e);
                trackEvent('event/view/full-extent', 'Full extent');
                hideDetail();
                fitBounds();
            });
            L.DomEvent.on(resetView, 'click', e => {
                L.DomEvent.preventDefault(e);
                trackEvent('event/view/reset', 'Reset view');
                resetToDefaults();
            });
            L.DomEvent.on(zoomOut, 'click', e => {
                L.DomEvent.preventDefault(e);
                trackEvent('event/zoom/out', 'Zoom out');
                map.zoomOut();
            });

            const helpBtn = L.DomUtil.create('button', 'help-toggle-btn', container);
            helpBtn.type = 'button';
            helpBtn.title = shortcutsLabel;
            helpBtn.setAttribute('aria-label', shortcutsLabel);
            helpBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            helpBtn.addEventListener('click', () => {
                trackEvent('event/help', 'Help overlay');
                toggleHelpOverlay();
            });

            if (toggleLegalOverlay) {
                const legalBtn = L.DomUtil.create('button', 'help-toggle-btn', container);
                legalBtn.type = 'button';
                legalBtn.title = legalLabel;
                legalBtn.setAttribute('aria-label', legalLabel);
                legalBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
                legalBtn.addEventListener('click', () => {
                    trackEvent('event/legal', 'Legal overlay');
                    toggleLegalOverlay();
                });
            }

            return container;
        }
    });

    return BottomBarControl;
}
