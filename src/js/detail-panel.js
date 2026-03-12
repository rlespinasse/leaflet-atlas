// --- Detail panel: DOM management, navigation history, HTML builders ---

import { escapeHtml, renderValue, featureLink } from './helpers.js';

// --- HTML builders ---

export function sourceRow(source) {
    return ['Sources', { __html: `<a href="${source.url}" target="_blank" rel="noopener">${source.name}<span class="cross-link-icon"> \u2197</span></a>` }];
}

export function buildDetail(title, layerId, groups, styles, allLayerDefs) {
    const color = styles[layerId] ? (styles[layerId].fillColor || styles[layerId].color) : '#888';
    const def = allLayerDefs.find(d => d.id === layerId);
    const layerLabel = def ? def.label : layerId;
    let html = `<div class="detail-header"><span class="detail-layer-type"><span class="detail-layer-badge" style="background:${color}"></span>${escapeHtml(layerLabel)}</span></div><h3>${escapeHtml(title)}</h3>`;
    for (const group of groups) {
        const rows = group.rows.filter(Boolean);
        if (rows.length === 0) continue;
        html += `<h4>${escapeHtml(group.label)}</h4><table>`;
        for (const row of rows) {
            html += `<tr><td>${escapeHtml(row[0])}</td><td>${renderValue(row[1])}</td></tr>`;
        }
        html += '</table>';
    }
    return html;
}

export function buildReverseLinksSection(data, sectionLabel, allLayerDefs) {
    if (!data) return null;
    const rows = [];
    for (const [layerId, items] of Object.entries(data)) {
        const def = allLayerDefs.find(d => d.id === layerId);
        const layerLabel = def ? def.label : layerId;
        const links = items.map(item => featureLink(layerId, item.index, item.label));
        rows.push([layerLabel, { __html: links.join('<br>') }]);
    }
    return rows.length ? { label: sectionLabel, rows } : null;
}

// --- Detail panel DOM management ---

export class DetailPanel {
    constructor(container, { onHide, trackEvent }) {
        this._container = container;
        this._onHide = onHide;
        this._trackEvent = trackEvent || (() => {});

        this._backStack = [];
        this._forwardStack = [];
        this._lastClosed = null;
        this._selectedFeatureInfo = null;

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        this._panel = document.createElement('aside');
        this._panel.className = 'detail-panel';

        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        this._panel.appendChild(dragHandle);

        const actions = document.createElement('div');
        actions.className = 'panel-actions';

        this._backBtn = document.createElement('button');
        this._backBtn.className = 'panel-nav-btn';
        this._backBtn.setAttribute('aria-label', 'Retour');
        this._backBtn.style.display = 'none';
        this._backBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';

        this._forwardBtn = document.createElement('button');
        this._forwardBtn.className = 'panel-nav-btn';
        this._forwardBtn.setAttribute('aria-label', 'Suivant');
        this._forwardBtn.style.display = 'none';
        this._forwardBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

        this._clearHistoryBtn = document.createElement('button');
        this._clearHistoryBtn.className = 'panel-nav-btn';
        this._clearHistoryBtn.setAttribute('aria-label', 'Effacer l\'historique');
        this._clearHistoryBtn.style.display = 'none';
        this._clearHistoryBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';

        this._sep = document.createElement('span');
        this._sep.className = 'panel-actions-sep';
        this._sep.style.display = 'none';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close-btn';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            this._trackEvent('event/panel/close', 'Detail panel close');
            this.hide();
        });

        actions.appendChild(this._backBtn);
        actions.appendChild(this._forwardBtn);
        actions.appendChild(this._clearHistoryBtn);
        actions.appendChild(this._sep);
        actions.appendChild(closeBtn);
        this._panel.appendChild(actions);

        this._content = document.createElement('div');
        this._content.className = 'detail-content';
        this._panel.appendChild(this._content);

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        this._panel.appendChild(resizeHandle);
        this._resizeHandle = resizeHandle;

        this._container.appendChild(this._panel);
    }

    _bindEvents() {
        this._backBtn.addEventListener('click', () => {
            if (!this._backStack.length) return;
            this._trackEvent('event/panel/back', 'Detail panel back');
            this._forwardStack.push({
                html: this._content.innerHTML,
                featureInfo: this._selectedFeatureInfo ? { ...this._selectedFeatureInfo } : null
            });
            const prev = this._backStack.pop();
            this._selectedFeatureInfo = prev.featureInfo;
            this._content.innerHTML = prev.html;
            this._updateNavButtons();
            if (this._onHashUpdate) this._onHashUpdate();
        });

        this._forwardBtn.addEventListener('click', () => {
            if (!this._forwardStack.length) return;
            this._trackEvent('event/panel/forward', 'Detail panel forward');
            this._backStack.push({
                html: this._content.innerHTML,
                featureInfo: this._selectedFeatureInfo ? { ...this._selectedFeatureInfo } : null
            });
            const next = this._forwardStack.pop();
            this._selectedFeatureInfo = next.featureInfo;
            this._content.innerHTML = next.html;
            this._updateNavButtons();
            if (this._onHashUpdate) this._onHashUpdate();
        });

        this._clearHistoryBtn.addEventListener('click', () => {
            this._trackEvent('event/panel/clear-history', 'Detail panel clear history');
            this._backStack.length = 0;
            this._forwardStack.length = 0;
            this._updateNavButtons();
        });
    }

    _updateNavButtons() {
        const hasBack = this._backStack.length > 0;
        const hasForward = this._forwardStack.length > 0;
        const hasNav = hasBack || hasForward;
        this._backBtn.style.display = hasNav ? '' : 'none';
        this._forwardBtn.style.display = hasNav ? '' : 'none';
        this._clearHistoryBtn.style.display = hasNav ? '' : 'none';
        this._backBtn.disabled = !hasBack;
        this._forwardBtn.disabled = !hasForward;
        this._sep.style.display = hasNav ? '' : 'none';
    }

    setHashUpdateCallback(fn) {
        this._onHashUpdate = fn;
    }

    show(html, map, layersDrawer) {
        if (window.innerWidth <= 600 && layersDrawer && layersDrawer.isOpen()) {
            layersDrawer.close();
        }
        if (this._panel.classList.contains('open') && this._content.innerHTML) {
            this._backStack.push({
                html: this._content.innerHTML,
                featureInfo: this._selectedFeatureInfo ? { ...this._selectedFeatureInfo } : null
            });
            this._forwardStack.length = 0;
        }
        this._content.innerHTML = html;
        this._panel.classList.add('open');
        this._updateNavButtons();
        if (map) map.invalidateSize();
    }

    hide(map) {
        if (this._panel.classList.contains('open') && this._content.innerHTML) {
            this._lastClosed = {
                html: this._content.innerHTML,
                featureInfo: this._selectedFeatureInfo ? { ...this._selectedFeatureInfo } : null
            };
        }
        this._panel.classList.remove('open');
        this._selectedFeatureInfo = null;
        this._backStack.length = 0;
        this._forwardStack.length = 0;
        this._updateNavButtons();
        if (map) map.invalidateSize();
        if (this._onHide) this._onHide();
    }

    reopenLast(map, layersDrawer) {
        if (!this._lastClosed) return;
        this._selectedFeatureInfo = this._lastClosed.featureInfo;
        this.show(this._lastClosed.html, map, layersDrawer);
    }

    isOpen() {
        return this._panel.classList.contains('open');
    }

    getContentElement() {
        return this._content;
    }

    getPanel() {
        return this._panel;
    }

    getResizeHandle() {
        return this._resizeHandle;
    }

    getBackButton() {
        return this._backBtn;
    }

    getForwardButton() {
        return this._forwardBtn;
    }

    setSelectedFeatureInfo(info) {
        this._selectedFeatureInfo = info;
    }

    getSelectedFeatureInfo() {
        return this._selectedFeatureInfo;
    }
}
