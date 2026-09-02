/**
 * documentGeometryUtils.ts
 *
 * Geometric calculations, validation, deskew analysis, and aspect-ratio preservation
 * for document scanning, perspective homography warping, and print preparation.
 */

export interface Point {
  x: number;
  y: number;
}

export type QuadCorners = [Point, Point, Point, Point]; // [TL, TR, BR, BL]

export interface NaturalQuadDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  topWidth: number;
  bottomWidth: number;
  leftHeight: number;
  rightHeight: number;
}

export interface GeometryValidationResult {
  isValid: boolean;
  isConvex: boolean;
  area: number;
  skewAngleDeg: number;
  errors: string[];
  warnings: string[];
}

/**
 * Euclidean distance between two 2D points.
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculate the natural width, height, and aspect ratio of a quadrilateral
 * using the average Euclidean lengths of opposite sides.
 */
export function calculateNaturalQuadDimensions(corners: QuadCorners): NaturalQuadDimensions {
  const [tl, tr, br, bl] = corners;

  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);

  // Maximum width & height to capture maximum resolution
  const avgWidth = Math.round((topWidth + bottomWidth) / 2);
  const avgHeight = Math.round((leftHeight + rightHeight) / 2);

  const width = Math.max(1, avgWidth);
  const height = Math.max(1, avgHeight);
  const aspectRatio = width / (height || 1);

  let orientation: 'portrait' | 'landscape' | 'square';
  if (Math.abs(width - height) < 2) {
    orientation = 'square';
  } else if (width > height) {
    orientation = 'landscape';
  } else {
    orientation = 'portrait';
  }

  return {
    width,
    height,
    aspectRatio,
    orientation,
    topWidth,
    bottomWidth,
    leftHeight,
    rightHeight,
  };
}

/**
 * Computes polygon area using the Shoelace formula.
 */
export function calculatePolygonArea(corners: QuadCorners): number {
  const [p0, p1, p2, p3] = corners;
  return 0.5 * Math.abs(
    p0.x * p1.y + p1.x * p2.y + p2.x * p3.y + p3.x * p0.y -
    (p1.x * p0.y + p2.x * p1.y + p3.x * p2.y + p0.x * p3.y)
  );
}

/**
 * Cross product of vectors (p2 - p1) and (p3 - p2).
 * Positive = counter-clockwise turn, Negative = clockwise turn.
 */
function crossProductZ(p1: Point, p2: Point, p3: Point): number {
  return (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
}

/**
 * Check if two line segments (p1-p2) and (p3-p4) strictly intersect.
 */
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = crossProductZ(p3, p4, p1);
  const d2 = crossProductZ(p3, p4, p2);
  const d3 = crossProductZ(p1, p2, p3);
  const d4 = crossProductZ(p1, p2, p4);

  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * Check if a quadrilateral is strictly convex and non-self-intersecting.
 */
export function isConvexQuad(corners: QuadCorners): boolean {
  const [p0, p1, p2, p3] = corners;

  // Check for self-intersecting opposite edges (e.g. hourglass shape)
  if (segmentsIntersect(p0, p1, p2, p3) || segmentsIntersect(p1, p2, p3, p0)) {
    return false;
  }

  const cp0 = crossProductZ(p3, p0, p1);
  const cp1 = crossProductZ(p0, p1, p2);
  const cp2 = crossProductZ(p1, p2, p3);
  const cp3 = crossProductZ(p2, p3, p0);

  const allPositive = cp0 > 0 && cp1 > 0 && cp2 > 0 && cp3 > 0;
  const allNegative = cp0 < 0 && cp1 < 0 && cp2 < 0 && cp3 < 0;

  return allPositive || allNegative;
}

/**
 * Computes the skew angle of the top and bottom edges relative to the horizontal axis (in degrees).
 */
export function computeDeskewAngle(corners: QuadCorners): number {
  const [tl, tr, br, bl] = corners;
  const angleTop = Math.atan2(tr.y - tl.y, tr.x - tl.x) * (180 / Math.PI);
  const angleBottom = Math.atan2(br.y - bl.y, br.x - bl.x) * (180 / Math.PI);
  return Number(((angleTop + angleBottom) / 2).toFixed(2));
}

/**
 * Validate quadrilateral geometry for perspective correction.
 * Ensures the corners form a realistic, non-inverted, convex document frame.
 */
export function validateQuadGeometry(
  corners: QuadCorners,
  imageWidth: number = 1920,
  imageHeight: number = 1080
): GeometryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isConvex = isConvexQuad(corners);
  if (!isConvex) {
    errors.push('Sudut dokumen tidak membentuk bidang cembung (quadrilateral tidak valid).');
  }

  const area = calculatePolygonArea(corners);
  const totalImgArea = imageWidth * imageHeight;
  const areaRatio = area / (totalImgArea || 1);

  if (area < 100 || areaRatio < 0.03) {
    errors.push('Area dokumen yang terdeteksi terlalu kecil.');
  }

  const [tl, tr, br, bl] = corners;
  const topW = distance(tl, tr);
  const botW = distance(bl, br);
  const leftH = distance(tl, bl);
  const rightH = distance(tr, br);

  if (topW < 20 || botW < 20 || leftH < 20 || rightH < 20) {
    errors.push('Salah satu sisi dokumen terlalu pendek.');
  }

  // Check parallel ratios
  const wRatio = Math.max(topW, botW) / (Math.min(topW, botW) || 1);
  const hRatio = Math.max(leftH, rightH) / (Math.min(leftH, rightH) || 1);

  if (wRatio > 3.0 || hRatio > 3.0) {
    warnings.push('Sudut pengambilan gambar dokumen sangat miring/distorsi tinggi.');
  }

  const skewAngleDeg = computeDeskewAngle(corners);

  return {
    isValid: errors.length === 0,
    isConvex,
    area,
    skewAngleDeg,
    errors,
    warnings,
  };
}

/**
 * Calculate optimal output canvas dimensions that scale the natural quad dimensions
 * to fit standard scanning resolution while strictly preserving the true aspect ratio.
 */
export function calculateTargetOutputDimensions(
  corners: QuadCorners,
  maxDimension: number = 1754
): { outW: number; outH: number; natural: NaturalQuadDimensions } {
  const natural = calculateNaturalQuadDimensions(corners);

  let outW: number;
  let outH: number;

  if (natural.width >= natural.height) {
    outW = maxDimension;
    outH = Math.max(1, Math.round(maxDimension / natural.aspectRatio));
  } else {
    outH = maxDimension;
    outW = Math.max(1, Math.round(maxDimension * natural.aspectRatio));
  }

  return {
    outW,
    outH,
    natural,
  };
}
