import { describe, it, expect } from 'vitest';
import { pointInGeometry, featureBoundsArea, buildTileThumbnailUrl, normalizeText } from './helpers.js';

// --- normalizeText ---

describe('normalizeText', () => {
    it('lowercases and strips diacritics', () => {
        expect(normalizeText('Île-de-France')).toBe('ile-de-france');
    });

    it('returns empty string for empty input', () => {
        expect(normalizeText('')).toBe('');
    });

    it('passes through plain ASCII unchanged', () => {
        expect(normalizeText('hello')).toBe('hello');
    });
});

// --- pointInGeometry ---

const square = {
    type: 'Polygon',
    coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
};

const squareWithHole = {
    type: 'Polygon',
    coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
    ],
};

const multiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
        [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]],
    ],
};

describe('pointInGeometry', () => {
    it('returns true for point inside polygon', () => {
        expect(pointInGeometry({ lat: 5, lng: 5 }, square)).toBe(true);
    });

    it('returns false for point outside polygon', () => {
        expect(pointInGeometry({ lat: 15, lng: 15 }, square)).toBe(false);
    });

    it('returns false for point inside hole', () => {
        expect(pointInGeometry({ lat: 5, lng: 5 }, squareWithHole)).toBe(false);
    });

    it('returns true for point in shell but outside hole', () => {
        expect(pointInGeometry({ lat: 1, lng: 1 }, squareWithHole)).toBe(true);
    });

    it('returns true for point in second polygon of MultiPolygon', () => {
        expect(pointInGeometry({ lat: 25, lng: 25 }, multiPolygon)).toBe(true);
    });

    it('returns false for point outside all polygons of MultiPolygon', () => {
        expect(pointInGeometry({ lat: 15, lng: 15 }, multiPolygon)).toBe(false);
    });

    it('returns false for unsupported geometry type', () => {
        expect(pointInGeometry({ lat: 0, lng: 0 }, { type: 'Point', coordinates: [0, 0] })).toBe(false);
    });
});

// --- featureBoundsArea ---

describe('featureBoundsArea', () => {
    it('computes bounding box area for a Polygon', () => {
        const feature = { geometry: square };
        expect(featureBoundsArea(feature)).toBe(100); // 10 * 10
    });

    it('computes bounding box area for a MultiPolygon', () => {
        const feature = { geometry: multiPolygon };
        // bbox spans [0,0] to [30,30] → 30*30 = 900
        expect(featureBoundsArea(feature)).toBe(900);
    });

    it('returns Infinity for unsupported geometry type', () => {
        const feature = { geometry: { type: 'Point', coordinates: [0, 0] } };
        expect(featureBoundsArea(feature)).toBe(Infinity);
    });

    it('returns Infinity for empty coordinates', () => {
        const feature = { geometry: { type: 'Polygon', coordinates: [[]] } };
        expect(featureBoundsArea(feature)).toBe(Infinity);
    });
});

// --- buildTileThumbnailUrl ---

describe('buildTileThumbnailUrl', () => {
    it('replaces z/x/y/s placeholders', () => {
        const url = buildTileThumbnailUrl(
            'https://tile.example.com/{s}/{z}/{x}/{y}.png',
            [0, 0], 10, null
        );
        expect(url).toBe('https://tile.example.com/a/10/512/512.png');
    });

    it('uses custom subdomains from options', () => {
        const url = buildTileThumbnailUrl(
            'https://{s}.tile.example.com/{z}/{x}/{y}.png',
            [0, 0], 1, { subdomains: 'xyz' }
        );
        expect(url).toContain('https://x.tile.example.com/');
    });

    it('handles array subdomains', () => {
        const url = buildTileThumbnailUrl(
            'https://{s}.tile.example.com/{z}/{x}/{y}.png',
            [0, 0], 1, { subdomains: ['t1', 't2'] }
        );
        expect(url).toContain('https://t1.tile.example.com/');
    });

    it('computes correct tile for Paris (~48.86, 2.35) at zoom 10', () => {
        const url = buildTileThumbnailUrl(
            'https://tile.example.com/{z}/{x}/{y}.png',
            [48.86, 2.35], 10, null
        );
        // x = floor((2.35 + 180) / 360 * 1024) = floor(518.7) = 518
        // y ≈ 352
        expect(url).toMatch(/^https:\/\/tile\.example\.com\/10\/\d+\/\d+\.png$/);
        expect(url).toBe('https://tile.example.com/10/518/352.png');
    });
});
