import { describe, it, expect } from 'vitest';
import {
  pxToMm,
  mmToPx,
  pxToInches,
  inchesToPx,
  getOrientation,
  calculateOptimalPrintSize,
  generateSinglePagePrintHtml,
  DEFAULT_SCREEN_DPI,
  DEFAULT_PRINT_DPI,
  HIGH_RES_PRINT_DPI,
} from './printDimensionUtils';

describe('printDimensionUtils - Unit Conversions', () => {
  it('converts px to mm accurately at default screen DPI (96)', () => {
    // 96 px at 96 dpi = 1 inch = 25.4 mm
    expect(pxToMm(96, DEFAULT_SCREEN_DPI)).toBe(25.4);
    expect(pxToMm(0, DEFAULT_SCREEN_DPI)).toBe(0);
    expect(pxToMm(-10, DEFAULT_SCREEN_DPI)).toBe(0);
  });

  it('converts mm to px accurately at default print DPI (150)', () => {
    // 25.4 mm = 1 inch = 150 px at 150 dpi
    expect(mmToPx(25.4, DEFAULT_PRINT_DPI)).toBe(150);
    expect(mmToPx(0, DEFAULT_PRINT_DPI)).toBe(0);
  });

  it('converts px to inches and inches to px at 300 DPI', () => {
    expect(pxToInches(300, HIGH_RES_PRINT_DPI)).toBe(1);
    expect(inchesToPx(2, HIGH_RES_PRINT_DPI)).toBe(600);
  });
});

describe('printDimensionUtils - Orientation Detection', () => {
  it('identifies portrait orientation', () => {
    expect(getOrientation(1240, 1754)).toBe('portrait');
  });

  it('identifies landscape orientation', () => {
    expect(getOrientation(1920, 1080)).toBe('landscape');
  });

  it('identifies square orientation', () => {
    expect(getOrientation(1000, 1000)).toBe('square');
  });
});

describe('printDimensionUtils - calculateOptimalPrintSize', () => {
  it('preserves exact aspect ratio when fitting within maxDimension', () => {
    const srcW = 2000;
    const srcH = 1000; // 2:1 aspect ratio landscape
    const result = calculateOptimalPrintSize(srcW, srcH, { maxDimensionPx: 1200 });

    expect(result.orientation).toBe('landscape');
    expect(result.widthPx).toBe(1200);
    expect(result.heightPx).toBe(600);
    expect(result.widthPx / result.heightPx).toBeCloseTo(2.0, 2);
  });

  it('preserves portrait aspect ratio when fitting within maxDimension', () => {
    const srcW = 800;
    const srcH = 1600; // 1:2 aspect ratio portrait
    const result = calculateOptimalPrintSize(srcW, srcH, { maxDimensionPx: 1200 });

    expect(result.orientation).toBe('portrait');
    expect(result.heightPx).toBe(1200);
    expect(result.widthPx).toBe(600);
    expect(result.widthPx / result.heightPx).toBeCloseTo(0.5, 2);
  });

  it('calculates print dimensions on A4 paper preserving aspect ratio without distortion', () => {
    // Landscape photo printed on A4
    const srcW = 1600;
    const srcH = 900;
    const result = calculateOptimalPrintSize(srcW, srcH, {
      fitMedia: 'A4',
      targetDpi: 150,
      marginMm: 10,
    });

    expect(result.orientation).toBe('landscape');
    expect(result.widthPx / result.heightPx).toBeCloseTo(1600 / 900, 2);
    expect(result.cssPageSize).toContain('landscape');
  });
});

describe('printDimensionUtils - generateSinglePagePrintHtml', () => {
  it('generates HTML containing proper print page CSS and no min-height: 100vh', () => {
    const html = generateSinglePagePrintHtml('blob:http://localhost/1234', 'Surat Masuk 01', {
      width: 1240,
      height: 1754,
      orientation: 'portrait',
    });

    expect(html).toContain('<title>Surat Masuk 01</title>');
    expect(html).toContain('size: portrait');
    expect(html).toContain('margin: 0');
    expect(html).toContain('page-break-inside: avoid');
    expect(html).toContain('page-break-after: avoid');
    // Ensure min-height: 100vh is NOT present to prevent extra blank page
    expect(html).not.toContain('min-height: 100vh');
  });

  it('escapes special characters in document title', () => {
    const html = generateSinglePagePrintHtml('blob:http://localhost/1234', '<script>alert("xss")</script>');
    expect(html).not.toContain('<script>alert');
  });
});
