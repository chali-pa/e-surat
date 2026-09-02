/**
 * printDimensionUtils.ts
 *
 * Types and utilities for reading image/file dimensions, unit conversions
 * (pixels <-> mm <-> inches <-> DPI), dynamic print media sizing, and
 * generating clean single-page print HTML without extra blank pages or warping.
 */

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  dpi?: number;
}

export interface PrintPageOptions {
  targetDpi?: number;
  maxDimensionPx?: number;
  fitMedia?: 'A4' | 'Letter' | 'auto';
  marginMm?: number;
}

export interface PrintSizeResult {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  scale: number;
  orientation: 'portrait' | 'landscape';
  cssPageSize: string;
}

// Standard standard paper dimensions in mm
export const PAPER_DIMENSIONS_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

export const DEFAULT_SCREEN_DPI = 96;
export const DEFAULT_PRINT_DPI = 150;
export const HIGH_RES_PRINT_DPI = 300;

// ─── Unit Conversion Functions ───────────────────────────────────────────────

/**
 * Convert pixels to millimetres at a given DPI.
 */
export function pxToMm(px: number, dpi: number = DEFAULT_SCREEN_DPI): number {
  if (!px || px <= 0) return 0;
  return Number(((px * 25.4) / dpi).toFixed(2));
}

/**
 * Convert millimetres to pixels at a given DPI.
 */
export function mmToPx(mm: number, dpi: number = DEFAULT_SCREEN_DPI): number {
  if (!mm || mm <= 0) return 0;
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Convert pixels to inches at a given DPI.
 */
export function pxToInches(px: number, dpi: number = DEFAULT_SCREEN_DPI): number {
  if (!px || px <= 0) return 0;
  return Number((px / dpi).toFixed(4));
}

/**
 * Convert inches to pixels at a given DPI.
 */
export function inchesToPx(inches: number, dpi: number = DEFAULT_SCREEN_DPI): number {
  if (!inches || inches <= 0) return 0;
  return Math.round(inches * dpi);
}

// ─── Dimension & Aspect Ratio Reader ─────────────────────────────────────────

/**
 * Calculate orientation based on aspect ratio (width / height).
 */
export function getOrientation(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Extract image natural dimensions from File, Blob, string URL, HTMLImageElement, or HTMLCanvasElement.
 */
export function getImageDimensions(
  source: File | Blob | string | HTMLImageElement | HTMLCanvasElement
): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
      const width = source.width;
      const height = source.height;
      const aspectRatio = width / (height || 1);
      resolve({
        width,
        height,
        aspectRatio,
        orientation: getOrientation(width, height),
        dpi: DEFAULT_SCREEN_DPI,
      });
      return;
    }

    if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
      const width = source.naturalWidth || source.width;
      const height = source.naturalHeight || source.height;
      const aspectRatio = width / (height || 1);
      resolve({
        width,
        height,
        aspectRatio,
        orientation: getOrientation(width, height),
        dpi: DEFAULT_SCREEN_DPI,
      });
      return;
    }

    let url: string;
    let shouldRevoke = false;

    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      url = URL.createObjectURL(source);
      shouldRevoke = true;
    } else if (typeof source === 'string') {
      url = source;
    } else {
      reject(new Error('Unsupported image source type'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const aspectRatio = width / (height || 1);
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
      resolve({
        width,
        height,
        aspectRatio,
        orientation: getOrientation(width, height),
        dpi: DEFAULT_SCREEN_DPI,
      });
    };
    img.onerror = (err) => {
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
      reject(new Error(`Failed to load image for dimension extraction: ${err}`));
    };
    img.src = url;
  });
}

// ─── Dynamic Print Sizing ───────────────────────────────────────────────────

/**
 * Calculates matching print canvas/page sizing that strictly preserves the original aspect ratio.
 * Fits within standard printable bounds (A4/Letter or custom dimensions) without stretching or letterboxing.
 */
export function calculateOptimalPrintSize(
  sourceWidth: number,
  sourceHeight: number,
  options: PrintPageOptions = {}
): PrintSizeResult {
  const {
    targetDpi = DEFAULT_PRINT_DPI,
    maxDimensionPx = 1754,
    fitMedia = 'auto',
    marginMm = 0,
  } = options;

  const aspectRatio = sourceWidth / (sourceHeight || 1);
  const orientation: 'portrait' | 'landscape' = sourceWidth >= sourceHeight ? 'landscape' : 'portrait';

  // Base canvas pixel sizing maintaining exact aspect ratio
  let widthPx: number;
  let heightPx: number;
  let scale = 1;

  if (fitMedia === 'A4' || fitMedia === 'Letter') {
    const paper = PAPER_DIMENSIONS_MM[fitMedia];
    const printableWidthMm = (orientation === 'landscape' ? paper.height : paper.width) - marginMm * 2;
    const printableHeightMm = (orientation === 'landscape' ? paper.width : paper.height) - marginMm * 2;

    const paperAspect = printableWidthMm / printableHeightMm;

    if (aspectRatio > paperAspect) {
      // Source is wider than paper aspect
      widthPx = mmToPx(printableWidthMm, targetDpi);
      heightPx = Math.round(widthPx / aspectRatio);
    } else {
      // Source is taller than paper aspect
      heightPx = mmToPx(printableHeightMm, targetDpi);
      widthPx = Math.round(heightPx * aspectRatio);
    }
    scale = widthPx / sourceWidth;
  } else {
    // Auto mode: fit within maxDimensionPx while maintaining exact aspect ratio
    if (sourceWidth >= sourceHeight) {
      widthPx = Math.min(sourceWidth, maxDimensionPx);
      heightPx = Math.round(widthPx / aspectRatio);
    } else {
      heightPx = Math.min(sourceHeight, maxDimensionPx);
      widthPx = Math.round(heightPx * aspectRatio);
    }
    scale = widthPx / sourceWidth;
  }

  const widthMm = pxToMm(widthPx, targetDpi);
  const heightMm = pxToMm(heightPx, targetDpi);
  const cssPageSize = `${orientation};`;

  return {
    widthPx,
    heightPx,
    widthMm,
    heightMm,
    scale,
    orientation,
    cssPageSize,
  };
}

// ─── Single-Page Print HTML Generator ───────────────────────────────────────

/**
 * Generates clean, isolated single-page print HTML.
 * Eliminates browser print engine bugs (e.g. min-height: 100vh creating an extra blank 2nd page),
 * sets @page orientation and 0 margin, and ensures content is centered and scaled properly.
 */
export function generateSinglePagePrintHtml(
  imageSrc: string,
  title: string = 'Dokumen',
  dimensions?: { width: number; height: number; orientation?: 'portrait' | 'landscape' }
): string {
  const orientation = dimensions?.orientation ||
    (dimensions && dimensions.width > dimensions.height ? 'landscape' : 'portrait');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${title.replace(/[<>&"]/g, '')}</title>
  <style>
    @page {
      size: ${orientation};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff;
      overflow: hidden;
    }
    .print-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid;
      page-break-after: avoid;
      page-break-before: avoid;
    }
    .print-image {
      max-width: 100vw;
      max-height: 100vh;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    @media print {
      html, body {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .print-container {
        width: 100%;
        height: 100%;
        page-break-inside: avoid;
        page-break-after: avoid;
      }
      .print-image {
        max-width: 100%;
        max-height: 100%;
        page-break-inside: avoid;
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <img class="print-image" src="${imageSrc}" alt="${title.replace(/[<>&"]/g, '')}" />
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        } catch (e) {
          console.error('Print trigger error:', e);
        }
      }, 250);
    };
  </script>
</body>
</html>`;
}
