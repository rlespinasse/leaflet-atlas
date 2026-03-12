// --- Pluggable analytics ---

export function isLocalhost() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '0.0.0.0';
}

export function createAnalytics(config) {
    if (!config || !config.provider) {
        return {
            trackEvent: () => {},
            trackPageView: () => {},
        };
    }

    if (config.provider === 'goatcounter') {
        const basePath = config.basePath || '/';
        return {
            trackEvent(path, title) {
                if (!isLocalhost() && window.goatcounter && window.goatcounter.count) {
                    window.goatcounter.count({ path: basePath + path, title, event: true });
                }
            },
            trackPageView() {
                if (!isLocalhost() && window.goatcounter && window.goatcounter.count) {
                    window.goatcounter.count({ path: location.pathname, title: document.title });
                }
            },
        };
    }

    return {
        trackEvent: () => {},
        trackPageView: () => {},
    };
}
