import { describe, it, expect } from 'vitest';
import {
  distance,
  calculateNaturalQuadDimensions,
  calculatePolygonArea,
  isConvexQuad,
  computeDeskewAngle,
  validateQuadGeometry,
  calculateTargetOutputDimensions,
  QuadCorners,
} from './documentGeometryUtils';

describe('documentGeometryUtils - Basic Geometry', () => {
  it('calculates Euclidean distance accurately', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });

  it('calculates polygon area of a rectangle', () => {
    const rect: QuadCorners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    expect(calculatePolygonArea(rect)).toBe(5000);
  });
});

describe('documentGeometryUtils - Natural Quad Dimensions', () => {
  it('computes natural dimensions of a standard A4 portrait quadrilateral', () => {
    const corners: QuadCorners = [
      { x: 100, y: 100 },
      { x: 700, y: 100 },
      { x: 700, y: 948 },
      { x: 100, y: 948 },
    ];
    const dims = calculateNaturalQuadDimensions(corners);

    expect(dims.width).toBe(600);
    expect(dims.height).toBe(848);
    expect(dims.aspectRatio).toBeCloseTo(600 / 848, 2);
    expect(dims.orientation).toBe('portrait');
  });

  it('computes natural dimensions of a landscape document', () => {
    const corners: QuadCorners = [
      { x: 50, y: 100 },
      { x: 1050, y: 100 },
      { x: 1050, y: 600 },
      { x: 50, y: 600 },
    ];
    const dims = calculateNaturalQuadDimensions(corners);

    expect(dims.width).toBe(1000);
    expect(dims.height).toBe(500);
    expect(dims.aspectRatio).toBe(2);
    expect(dims.orientation).toBe('landscape');
  });

  it('computes natural dimensions of an angled/trapezoidal perspective quad', () => {
    // Top is further away (narrower), bottom is closer (wider)
    const corners: QuadCorners = [
      { x: 300, y: 100 }, // TL
      { x: 700, y: 100 }, // TR (topW = 400)
      { x: 800, y: 700 }, // BR
      { x: 200, y: 700 }, // BL (botW = 600)
    ];
    const dims = calculateNaturalQuadDimensions(corners);

    // avgWidth = (400 + 600)/2 = 500
    expect(dims.width).toBe(500);
    expect(dims.height).toBe(608);
    expect(dims.aspectRatio).toBeCloseTo(500 / 608, 1);
  });
});

describe('documentGeometryUtils - Convexity & Validation', () => {
  it('accepts a valid convex quadrilateral', () => {
    const corners: QuadCorners = [
      { x: 100, y: 100 },
      { x: 900, y: 120 },
      { x: 880, y: 800 },
      { x: 110, y: 780 },
    ];
    expect(isConvexQuad(corners)).toBe(true);

    const val = validateQuadGeometry(corners, 1000, 1000);
    expect(val.isValid).toBe(true);
    expect(val.errors.length).toBe(0);
  });

  it('rejects a concave "arrow / chevron" quadrilateral', () => {
    // Point 2 reflex angle (caves inward)
    const concave: QuadCorners = [
      { x: 100, y: 100 }, // TL
      { x: 800, y: 100 }, // TR
      { x: 400, y: 300 }, // reflex point indenting inwards
      { x: 100, y: 800 }, // BL
    ];
    expect(isConvexQuad(concave)).toBe(false);

    const val = validateQuadGeometry(concave, 1000, 1000);
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.includes('cembung'))).toBe(true);
  });

  it('rejects a self-intersecting "hourglass" quadrilateral', () => {
    // Diagonal cross (edges 0-1 and 2-3 intersect)
    const selfIntersecting: QuadCorners = [
      { x: 100, y: 100 },
      { x: 800, y: 800 },
      { x: 800, y: 100 },
      { x: 100, y: 800 },
    ];
    expect(isConvexQuad(selfIntersecting)).toBe(false);

    const val = validateQuadGeometry(selfIntersecting, 1000, 1000);
    expect(val.isValid).toBe(false);
  });

  it('rejects an area that is too small', () => {
    const tinyQuad: QuadCorners = [
      { x: 10, y: 10 },
      { x: 15, y: 10 },
      { x: 15, y: 15 },
      { x: 10, y: 15 },
    ];
    const val = validateQuadGeometry(tinyQuad, 1920, 1080);
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.includes('terlalu kecil'))).toBe(true);
  });
});

describe('documentGeometryUtils - Skew Angle & Target Dimensions', () => {
  it('computes 0 degree skew for horizontal edges', () => {
    const corners: QuadCorners = [
      { x: 100, y: 200 },
      { x: 800, y: 200 },
      { x: 800, y: 900 },
      { x: 100, y: 900 },
    ];
    expect(computeDeskewAngle(corners)).toBe(0);
  });

  it('computes positive tilt skew angle', () => {
    // Slanted 45 degrees up to the right
    const corners: QuadCorners = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 200, y: 400 },
      { x: 100, y: 300 },
    ];
    expect(computeDeskewAngle(corners)).toBe(45);
  });

  it('calculates target output dimensions preserving natural aspect ratio', () => {
    // 16:9 ratio document
    const corners: QuadCorners = [
      { x: 0, y: 0 },
      { x: 1600, y: 0 },
      { x: 1600, y: 900 },
      { x: 0, y: 900 },
    ];
    const target = calculateTargetOutputDimensions(corners, 1754);

    expect(target.outW).toBe(1754);
    expect(target.outH).toBe(Math.round(1754 / (1600 / 900)));
    expect(target.outW / target.outH).toBeCloseTo(16 / 9, 2);
  });
});
