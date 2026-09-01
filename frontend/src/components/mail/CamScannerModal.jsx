/**
 * CamScannerModal.jsx
 *
 * Full-screen CamScanner-style document capture modal.
 *
 * Pipeline (all client-side, no server round-trips):
 *   camera → adjust (corner handles) → preview (corrected result) → page-list → finish → PDF blob
 *
 *  Step 1 — Edge/corner detection
 *            Sobel edge map on a down-scaled image, then per-quadrant strongest-edge
 *            corner finder (replaces the old axis-aligned bounding-box approach).
 *
 *  Step 2 — Perspective correction
 *            True inverse projective homography via 4-point DLT (Direct Linear Transform).
 *            Replaces the previous bilinear UV-blend which only worked for rectangular input.
 *
 *  Step 3 — Sharpening
 *            3×3 Laplacian unsharp mask applied to the warped canvas.
 *
 *  Step 4 — Lighting normalisation
 *            Per-channel 2–98 percentile histogram stretch (auto-levels / white-balance).
 *            Removes shadow cast and uneven lighting from the original photo.
 *
 *  Step 5 — Enhancement modes
 *            • Color  → auto-levels only (preserves colour content)
 *            • B&W    → integral-image adaptive threshold, Bradley method
 *                       (handles local shadows; replaces previous global mean threshold)
 *
 *  Step 6 — Multi-page PDF via pdf-lib
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { MAX_MAIL_UPLOAD_SIZE_MB } from '../../config/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTPUT_WIDTH  = 1240; // A4-ish @ ~150 DPI
const OUTPUT_HEIGHT = 1754;
const TIP_SEEN_KEY  = 'camscanner_capture_tip_seen';

// ─── Image-processing pure functions ─────────────────────────────────────────

/**
 * Sobel edge magnitude map on a grayscale Float32Array.
 * Returns Float32Array of magnitudes [0…1], same w×h.
 */
function computeEdgeMagnitude(grayData, w, h) {
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -grayData[(y-1)*w+(x-1)] - 2*grayData[y*w+(x-1)] - grayData[(y+1)*w+(x-1)]
        +grayData[(y-1)*w+(x+1)] + 2*grayData[y*w+(x+1)] + grayData[(y+1)*w+(x+1)];
      const gy =
        -grayData[(y-1)*w+(x-1)] - 2*grayData[(y-1)*w+x] - grayData[(y-1)*w+(x+1)]
        +grayData[(y+1)*w+(x-1)] + 2*grayData[(y+1)*w+x] + grayData[(y+1)*w+(x+1)];
      edges[idx] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 255);
    }
  }
  return edges;
}

/**
 * Detect the 4 document corners in a canvas image.
 *
 * For each of the 4 corner quadrants the function scores every
 * above-threshold edge pixel by (edge_strength × closeness_to_that_corner)
 * and picks the winner, producing true quadrilateral corners rather than an
 * axis-aligned bounding box.
 *
 * Returns [{x,y}×4] as [tl, tr, br, bl] in original-image pixel coordinates.
 * Falls back to a 10 % inset rectangle when detection fails.
 */
function detectDocumentCorners(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, w, h).data;

  // Convert to grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Downsample to ≤ 400 px wide for speed
  const scale = Math.min(1, 400 / w);
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const dg = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      dg[y * sw + x] = gray[Math.min(w * h - 1, Math.round(y / scale) * w + Math.round(x / scale))];
    }
  }

  const edges = computeEdgeMagnitude(dg, sw, sh);

  // Per-quadrant corner detection
  // Quadrant search regions overlap slightly in the centre (40–60 %) so
  // they can find corners that are not perfectly on the image boundary.
  const mg = 0.05; // image-edge margin to exclude frame artifacts
  const mx0 = Math.round(sw * mg),       my0 = Math.round(sh * mg);
  const mx1 = Math.round(sw * (1 - mg)), my1 = Math.round(sh * (1 - mg));

  const quadrants = [
    { cx: 0,  cy: 0,  x0: mx0, y0: my0, x1: Math.round(sw * 0.65), y1: Math.round(sh * 0.65) }, // TL
    { cx: sw, cy: 0,  x0: Math.round(sw * 0.35), y0: my0, x1: mx1, y1: Math.round(sh * 0.65) }, // TR
    { cx: sw, cy: sh, x0: Math.round(sw * 0.35), y0: Math.round(sh * 0.35), x1: mx1, y1: my1 }, // BR
    { cx: 0,  cy: sh, x0: mx0, y0: Math.round(sh * 0.35), x1: Math.round(sw * 0.65), y1: my1 }, // BL
  ];

  const THRESHOLD = 0.12;
  const maxDist = Math.sqrt(sw * sw + sh * sh);
  const found = [];

  for (const q of quadrants) {
    let bestScore = -1, bestX = -1, bestY = -1;
    for (let y = q.y0; y < q.y1; y++) {
      for (let x = q.x0; x < q.x1; x++) {
        const e = edges[y * sw + x];
        if (e < THRESHOLD) continue;
        const dist = Math.sqrt((x - q.cx) ** 2 + (y - q.cy) ** 2);
        const score = e * (1 - dist / maxDist);
        if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
      }
    }
    found.push(bestX < 0 ? null : { x: Math.max(0, Math.min(w, bestX / scale)), y: Math.max(0, Math.min(h, bestY / scale)) });
  }

  if (found.some((c) => c === null)) {
    // Fallback: 10 % inset rectangle
    return [
      { x: w * 0.1, y: h * 0.1 }, { x: w * 0.9, y: h * 0.1 },
      { x: w * 0.9, y: h * 0.9 }, { x: w * 0.1, y: h * 0.9 },
    ];
  }
  return found;
}

/**
 * Compute a 3×3 projective homography H using the Direct Linear Transform (DLT)
 * with 4 point correspondences.
 *
 *   toPts[i] ≈ H · fromPts[i]   (homogeneous coordinates)
 *
 * Solves an 8×8 linear system by Gaussian elimination with partial pivoting.
 * Returns H as a flat 9-element row-major array [h1…h9] with h9 = 1.
 */
function computeHomography(fromPts, toPts) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x: xi, y: yi }   = fromPts[i];
    const { x: xi2, y: yi2 } = toPts[i];
    A.push([xi, yi, 1, 0, 0, 0, -xi * xi2, -yi * xi2]);
    b.push(xi2);
    A.push([0, 0, 0, xi, yi, 1, -xi * yi2, -yi * yi2]);
    b.push(yi2);
  }

  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) continue; // near-singular — skip

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
  }
  const h = M.map((row, i) => row[n] / row[i]);
  return [...h, 1]; // h1…h8 solved; h9 = 1 (fixed)
}

/** Apply a 9-element flat homography to point (x, y). */
function applyHomography(H, x, y) {
  const d = H[6] * x + H[7] * y + H[8];
  return { x: (H[0] * x + H[1] * y + H[2]) / d, y: (H[3] * x + H[4] * y + H[5]) / d };
}

/**
 * Perspective-correct a canvas using 4 source corner points.
 *
 * Uses a true inverse projective homography (DLT) for mathematically correct
 * deskewing of any quadrilateral, including trapezoid/angled perspectives.
 *
 * @param {HTMLCanvasElement} srcCanvas  Raw captured image
 * @param {Array<{x,y}>}      corners   [tl, tr, br, bl] in source pixel coords
 * @param {number}            outW      Output width  (default OUTPUT_WIDTH)
 * @param {number}            outH      Output height (default OUTPUT_HEIGHT)
 * @returns {HTMLCanvasElement}
 */
function applyPerspectiveTransform(srcCanvas, corners, outW = OUTPUT_WIDTH, outH = OUTPUT_HEIGHT) {
  const [tl, tr, br, bl] = corners;
  const srcW = srcCanvas.width, srcH = srcCanvas.height;

  // H maps dst-rect pixel → src-quad pixel (inverse direction for scanline rendering)
  const dstRect = [
    { x: 0,    y: 0    },
    { x: outW, y: 0    },
    { x: outW, y: outH },
    { x: 0,    y: outH },
  ];
  const H = computeHomography(dstRect, [tl, tr, br, bl]);

  const dst    = document.createElement('canvas');
  dst.width    = outW;
  dst.height   = outH;
  const dstCtx = dst.getContext('2d');

  const srcData = srcCanvas.getContext('2d').getImageData(0, 0, srcW, srcH).data;
  const dstImgData = dstCtx.createImageData(outW, outH);
  const d = dstImgData.data;

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const { x: sx, y: sy } = applyHomography(H, dx, dy);

      const sx0 = Math.floor(sx), sy0 = Math.floor(sy);
      const sx1 = Math.min(sx0 + 1, srcW - 1), sy1 = Math.min(sy0 + 1, srcH - 1);
      const fx = sx - sx0, fy = sy - sy0;
      const csx0 = Math.max(0, Math.min(srcW - 1, sx0));
      const csy0 = Math.max(0, Math.min(srcH - 1, sy0));
      const csx1 = Math.max(0, Math.min(srcW - 1, sx1));
      const csy1 = Math.max(0, Math.min(srcH - 1, sy1));

      const i00 = (csy0 * srcW + csx0) * 4;
      const i10 = (csy0 * srcW + csx1) * 4;
      const i01 = (csy1 * srcW + csx0) * 4;
      const i11 = (csy1 * srcW + csx1) * 4;
      const di  = (dy * outW + dx) * 4;

      for (let c = 0; c < 3; c++) {
        d[di + c] = Math.round(
          (1 - fx) * (1 - fy) * srcData[i00 + c] +
          fx       * (1 - fy) * srcData[i10 + c] +
          (1 - fx) * fy       * srcData[i01 + c] +
          fx       * fy       * srcData[i11 + c]
        );
      }
      d[di + 3] = 255;
    }
  }
  dstCtx.putImageData(dstImgData, 0, 0);
  return dst;
}

/**
 * Per-channel auto-levels: stretch the 2nd–98th percentile to [0, 255].
 * Removes colour casts and normalises uneven lighting without hard clipping.
 * Returns a new canvas.
 */
function applyAutoLevels(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height, n = w * h;
  const src = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;

  const dst    = document.createElement('canvas');
  dst.width    = w; dst.height = h;
  const dstCtx = dst.getContext('2d');
  const out    = dstCtx.createImageData(w, h);
  const o      = out.data;

  for (let ch = 0; ch < 3; ch++) {
    const hist = new Int32Array(256);
    for (let i = 0; i < n; i++) hist[src[i * 4 + ch]]++;

    let cumLo = 0, loVal = 0;
    for (let v = 0; v < 256; v++) {
      cumLo += hist[v];
      if (cumLo >= n * 0.02) { loVal = v; break; }
    }
    let cumHi = 0, hiVal = 255;
    for (let v = 255; v >= 0; v--) {
      cumHi += hist[v];
      if (cumHi >= n * 0.02) { hiVal = v; break; }
    }
    const range = Math.max(1, hiVal - loVal);

    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      lut[v] = Math.max(0, Math.min(255, Math.round((v - loVal) * 255 / range)));
    }
    for (let i = 0; i < n; i++) o[i * 4 + ch] = lut[src[i * 4 + ch]];
  }
  for (let i = 0; i < n; i++) o[i * 4 + 3] = 255;
  dstCtx.putImageData(out, 0, 0);
  return dst;
}

/**
 * Integral-image adaptive threshold — Bradley/Roth method.
 * Handles local shadows and brightness gradients far better than a global threshold.
 *
 * For each pixel the local mean is computed from a winSize×winSize window using
 * the summed-area table (O(1) per pixel after O(n) table build).
 * A pixel is white if its value > localMean × (1 − k).
 *
 * @param {Uint8ClampedArray} gray    Greyscale values, length w*h
 * @param {number}            w
 * @param {number}            h
 * @param {number}            winSize Neighbourhood size in pixels (default 71)
 * @param {number}            k       Sensitivity [0,1] (default 0.12)
 * @returns {Uint8ClampedArray} Binary output (0 or 255), length w*h
 */
function adaptiveThreshold(gray, w, h, winSize = 71, k = 0.12) {
  // Summed-area table, (w+1)×(h+1) to simplify boundary handling
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      sat[(y + 1) * (w + 1) + (x + 1)] =
        gray[y * w + x]
        + sat[y * (w + 1) + (x + 1)]
        + sat[(y + 1) * (w + 1) + x]
        - sat[y * (w + 1) + x];
    }
  }

  const half = Math.floor(winSize / 2);
  const out  = new Uint8ClampedArray(w * h);

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half), y2 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), x2 = Math.min(w - 1, x + half);
      const cnt = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = sat[(y2 + 1) * (w + 1) + (x2 + 1)]
                - sat[y1 * (w + 1) + (x2 + 1)]
                - sat[(y2 + 1) * (w + 1) + x1]
                + sat[y1 * (w + 1) + x1];
      out[y * w + x] = gray[y * w + x] > (sum / cnt) * (1 - k) ? 255 : 0;
    }
  }
  return out;
}

/**
 * Apply document enhancement:
 *   'color' → auto-levels (lighting normalisation, preserves colour)
 *   'bw'    → greyscale → integral-image adaptive threshold
 * Returns a new canvas.
 */
function applyFilter(srcCanvas, mode) {
  if (mode === 'color') {
    return applyAutoLevels(srcCanvas);
  }

  // B&W path
  const w = srcCanvas.width, h = srcCanvas.height;
  const data = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;

  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }
  const bw = adaptiveThreshold(gray, w, h);

  const dst    = document.createElement('canvas');
  dst.width    = w; dst.height = h;
  const dstCtx = dst.getContext('2d');
  const outData = dstCtx.createImageData(w, h);
  const o = outData.data;
  for (let i = 0; i < w * h; i++) {
    o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = bw[i];
    o[i * 4 + 3] = 255;
  }
  dstCtx.putImageData(outData, 0, 0);
  return dst;
}

/**
 * Unsharp mask sharpening using a 3×3 Laplacian-style kernel.
 * Applied to the perspective-corrected canvas before the enhancement filter.
 * Returns a new canvas.
 *
 * Kernel: centre = 1.5, orthogonal neighbours = −0.125 each (sum = 1)
 */
function applySharpening(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const src = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;

  const dst    = document.createElement('canvas');
  dst.width    = w; dst.height = h;
  const dstCtx = dst.getContext('2d');
  const outImgData = dstCtx.createImageData(w, h);
  const o = outImgData.data;

  const KC = 1.5, KN = -0.125; // centre + 4 neighbours; KN×4 + KC = 1 (neutral sum)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i  = (y * w + x) * 4;
      const iU = (Math.max(0, y - 1) * w + x) * 4;
      const iD = (Math.min(h - 1, y + 1) * w + x) * 4;
      const iL = (y * w + Math.max(0, x - 1)) * 4;
      const iR = (y * w + Math.min(w - 1, x + 1)) * 4;
      for (let c = 0; c < 3; c++) {
        o[i + c] = Math.max(0, Math.min(255, Math.round(
          KC * src[i + c] + KN * (src[iU + c] + src[iD + c] + src[iL + c] + src[iR + c])
        )));
      }
      o[i + 3] = 255;
    }
  }
  dstCtx.putImageData(outImgData, 0, 0);
  return dst;
}

/**
 * Assemble an array of processed canvases into a single multi-page PDF.
 * Returns a File object (application/pdf).
 */
async function assemblePagesToPdf(canvases) {
  const pdfDoc = await PDFDocument.create();
  for (const canvas of canvases) {
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64      = jpegDataUrl.split(',')[1];
    const jpegBytes   = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const jpegImage   = await pdfDoc.embedJpg(jpegBytes);
    const { width, height } = jpegImage.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(jpegImage, { x: 0, y: 0, width, height });
  }
  const pdfBytes  = await pdfDoc.save();
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return new File([pdfBytes], `scan_${timestamp}.pdf`, { type: 'application/pdf' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Draggable SVG corner handle for perspective corner adjustment. */
function CornerHandle({ cx, cy, onDrag, label }) {
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origX = cx, origY = cy;
    const onMove = (me) => onDrag(origX + (me.clientX - startX), origY + (me.clientY - startY));
    const onUp   = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [cx, cy, onDrag]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const t0 = e.touches[0];
    const startX = t0.clientX, startY = t0.clientY;
    const origX = cx, origY = cy;
    const onMove = (te) => { const t = te.touches[0]; onDrag(origX + (t.clientX - startX), origY + (t.clientY - startY)); };
    const onEnd  = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [cx, cy, onDrag]);

  return (
    <g style={{ cursor: 'grab', touchAction: 'none' }} onPointerDown={handlePointerDown} onTouchStart={handleTouchStart}>
      <circle cx={cx + 1} cy={cy + 1} r={18} fill="rgba(0,0,0,0.3)" />
      <circle cx={cx} cy={cy} r={17} fill="#4B164C" stroke="white" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={6}  fill="white" />
      <text x={cx} y={cy - 22} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
        {label}
      </text>
    </g>
  );
}

/** Thumbnail card for the page list, with reorder and delete controls. */
function PageThumbnail({ canvas, index, totalPages, onRemove, onMoveLeft, onMoveRight }) {
  const canvasRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !canvas) return;
    const ctx = el.getContext('2d');
    el.width  = canvas.width;
    el.height = canvas.height;
    ctx.drawImage(canvas, 0, 0);
  }, [canvas]);

  return (
    <div className="relative flex flex-col items-center flex-shrink-0 w-28 sm:w-32 bg-slate-900/80 p-2 rounded-xl border border-slate-800 shadow-lg">
      <div className="relative w-full rounded-lg overflow-hidden border-2 border-purple-300/40 shadow-md bg-white aspect-[210/297]">
        <canvas ref={canvasRef} className="w-full h-full object-cover" style={{ display: 'block' }} />
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#4B164C]/90 backdrop-blur-sm text-white text-[10px] font-bold shadow">
          {index + 1}
        </div>
      </div>

      <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-slate-800/80 gap-1">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveLeft} disabled={index === 0}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-purple-900/60 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs transition"
            title="Geser ke kiri" aria-label={`Geser halaman ${index + 1} ke kiri`}>
            <i className="bi bi-chevron-left" />
          </button>
          <button type="button" onClick={onMoveRight} disabled={index === totalPages - 1}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-purple-900/60 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs transition"
            title="Geser ke kanan" aria-label={`Geser halaman ${index + 1} ke kanan`}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onRemove}
              className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold transition" title="Konfirmasi hapus">
              Hapus
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)}
              className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] transition" title="Batal">
              Batal
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-400 flex items-center justify-center text-xs transition"
            title="Hapus halaman ini" aria-label={`Hapus halaman ${index + 1}`}>
            <i className="bi bi-trash" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * CamScannerModal
 *
 * Props:
 *   onComplete(file: File) — called with the assembled PDF file
 *   onCancel()             — called when the user dismisses
 */
export default function CamScannerModal({ onComplete, onCancel }) {

  // ── Step: 'camera' | 'adjust' | 'preview' | 'pages' ─────────────────────
  const [step, setStep] = useState('camera');

  // ── Camera ───────────────────────────────────────────────────────────────
  const videoRef          = useRef(null);
  const streamRef         = useRef(null);
  const capturedCanvasRef = useRef(null); // raw captured image canvas

  const [cameras, setCameras]               = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraError, setCameraError]       = useState(null);
  const [cameraLoading, setCameraLoading]   = useState(false);

  // ── First-time capture tips overlay ──────────────────────────────────────
  const [showFirstTimeTip, setShowFirstTimeTip] = useState(
    () => !localStorage.getItem(TIP_SEEN_KEY)
  );

  const dismissTip = useCallback(() => {
    localStorage.setItem(TIP_SEEN_KEY, '1');
    setShowFirstTimeTip(false);
  }, []);

  // ── Adjust step ──────────────────────────────────────────────────────────
  const [corners, setCorners]               = useState(null); // [{x,y}×4]: tl,tr,br,bl
  const [filter, setFilter]                 = useState('color'); // 'color' | 'bw'
  const [processing, setProcessing]         = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 1, h: 1 });
  const adjustContainerRef = useRef(null);

  // ── Preview step ─────────────────────────────────────────────────────────
  const [previewCanvas, setPreviewCanvas] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);

  // ── Pages list ───────────────────────────────────────────────────────────
  const [pages, setPages]             = useState([]);
  const [assembling, setAssembling]   = useState(false);
  const [assembleError, setAssembleError] = useState(null);

  // ── Help tooltip ─────────────────────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false);

  // ─── Camera lifecycle ─────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (deviceId) => {
    setCameraError(null);
    setCameraLoading(true);
    stopCamera();
    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const devices     = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);

      if (!deviceId && videoDevices.length > 0) {
        const activeLabel = stream.getVideoTracks()[0]?.label;
        const match = videoDevices.find((d) => d.label === activeLabel);
        setSelectedCamera(match?.deviceId || videoDevices[0].deviceId);
      }
    } catch (err) {
      const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.'
        : 'Tidak dapat membuka kamera. Pastikan kamera terhubung dan tidak digunakan aplikasi lain.';
      setCameraError(msg);
    } finally {
      setCameraLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (step === 'camera') startCamera(selectedCamera || undefined);
    return () => { if (step === 'camera') stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Capture photo ────────────────────────────────────────────────────────

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280, h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);

    capturedCanvasRef.current = canvas;
    setImageNaturalSize({ w, h });

    const detectedCorners = detectDocumentCorners(canvas);
    setCorners(detectedCorners);

    stopCamera();
    setStep('adjust');
  }, [stopCamera]);

  // ─── Adjust step: measure rendered size for SVG overlay ──────────────────

  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (step !== 'adjust') return;
    const measure = () => {
      const el = adjustContainerRef.current;
      if (el) setRenderedSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (adjustContainerRef.current) ro.observe(adjustContainerRef.current);
    return () => ro.disconnect();
  }, [step]);

  const scaleX = renderedSize.w / imageNaturalSize.w;
  const scaleY = renderedSize.h / imageNaturalSize.h;

  const renderedCorners = corners
    ? corners.map((c) => ({ x: c.x * scaleX, y: c.y * scaleY }))
    : [];

  const updateCorner = useCallback((idx, rendX, rendY) => {
    setCorners((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = {
        x: Math.max(0, Math.min(imageNaturalSize.w, rendX / scaleX)),
        y: Math.max(0, Math.min(imageNaturalSize.h, rendY / scaleY)),
      };
      return next;
    });
  }, [imageNaturalSize, scaleX, scaleY]);

  // ─── Process page → preview ──────────────────────────────────────────────

  const handleProcess = useCallback(async () => {
    if (!capturedCanvasRef.current || !corners) return;
    setProcessing(true);
    try {
      // Yield to let the spinner render
      await new Promise((resolve) => setTimeout(resolve, 30));

      // 1. Perspective correction (true homography)
      const corrected = applyPerspectiveTransform(capturedCanvasRef.current, corners);

      // Yield between heavy steps to avoid complete UI lock
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 2. Sharpening (applied before the filter so both modes benefit)
      const sharpened = applySharpening(corrected);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // 3. Enhancement filter (auto-levels for color, adaptive threshold for B&W)
      const filtered = applyFilter(sharpened, filter);

      // Store result and advance to preview step
      setPreviewCanvas(filtered);
      setPreviewDataUrl(filtered.toDataURL('image/jpeg', 0.88));
      setStep('preview');
    } finally {
      setProcessing(false);
    }
  }, [corners, filter]);

  // ─── Accept preview → add to pages list ──────────────────────────────────

  const handleAcceptPage = useCallback(() => {
    if (!previewCanvas) return;
    setPages((prev) => [...prev, previewCanvas]);
    setPreviewCanvas(null);
    setPreviewDataUrl(null);
    setStep('pages');
  }, [previewCanvas]);

  // ─── Retry → back to adjust ───────────────────────────────────────────────

  const handleRetryAdjust = useCallback(() => {
    setPreviewCanvas(null);
    setPreviewDataUrl(null);
    setStep('adjust');
  }, []);

  // ─── Remove / reorder pages ───────────────────────────────────────────────

  const handleRemovePage = useCallback((idx) => {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleMovePage = useCallback((fromIndex, toIndex) => {
    setPages((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated;
    });
  }, []);

  // ─── Add another page ────────────────────────────────────────────────────

  const handleAddPage = useCallback(() => {
    capturedCanvasRef.current = null;
    setCorners(null);
    setStep('camera');
  }, []);

  // ─── Finish — assemble PDF ────────────────────────────────────────────────

  const handleFinish = useCallback(async () => {
    if (pages.length === 0) return;
    setAssembling(true);
    setAssembleError(null);
    try {
      const pdfFile   = await assemblePagesToPdf(pages);
      const limitBytes = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;
      if (pdfFile.size > limitBytes) {
        setAssembleError(
          `PDF hasil scan (${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas ${MAX_MAIL_UPLOAD_SIZE_MB} MB. ` +
          `Coba kurangi jumlah halaman atau gunakan mode Hitam-Putih untuk mengecilkan ukuran.`
        );
        return;
      }
      onComplete(pdfFile);
    } catch (err) {
      console.error('PDF assembly error:', err);
      setAssembleError('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setAssembling(false);
    }
  }, [pages, onComplete]);

  // ─── Help tooltip close-on-outside-click ─────────────────────────────────

  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e) => { if (!e.target.closest('[data-scan-help]')) setHelpOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [helpOpen]);

  // ─── Captured image data URL (for adjust step background) ────────────────

  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  useEffect(() => {
    if (step === 'adjust' && capturedCanvasRef.current) {
      setCapturedDataUrl(capturedCanvasRef.current.toDataURL('image/jpeg', 0.8));
    }
  }, [step]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const stepNum =
    step === 'camera'  ? 1 :
    step === 'adjust'  ? 2 :
    step === 'preview' ? 3 : 4;

  const cornerLabels = ['↖', '↗', '↘', '↙'];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label="Scan dokumen dengan kamera"
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shadow-lg">

        {/* 4-step indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {[
            { n: 1, label: 'Foto'    },
            { n: 2, label: 'Sudut'   },
            { n: 3, label: 'Tinjau'  },
            { n: 4, label: 'Selesai' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                stepNum === n
                  ? 'bg-[#4B164C] text-white shadow-md shadow-purple-900/40'
                  : stepNum > n
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {stepNum > n ? <i className="bi bi-check text-xs" /> : n}
              </span>
              <span className={`text-xs font-semibold hidden sm:inline ${
                stepNum === n ? 'text-white' : stepNum > n ? 'text-emerald-400' : 'text-slate-600'
              }`}>
                {label}
              </span>
              {n < 4 && <span className="text-slate-700 text-xs hidden sm:inline">›</span>}
            </div>
          ))}
        </div>

        {/* Right: help + close */}
        <div className="flex items-center gap-2">
          <div className="relative" data-scan-help>
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition flex items-center justify-center text-sm"
              aria-label="Bantuan scan kamera"
              title="Bantuan"
            >
              <i className="bi bi-question-lg" />
            </button>
            {helpOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 text-slate-800">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-[#4B164C]">
                  <i className="bi bi-camera-fill" /> Cara Scan Dokumen yang Baik
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#4B164C] font-bold shrink-0">💡</span>
                    <span><strong>Pencahayaan:</strong> Pastikan dokumen berada di bawah cahaya yang merata. Hindari bayangan di atas halaman.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#4B164C] font-bold shrink-0">📐</span>
                    <span><strong>Posisi kamera:</strong> Pegang kamera lurus di atas dokumen (tegak lurus), bukan dari sudut miring.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#4B164C] font-bold shrink-0">🖼️</span>
                    <span><strong>Bingkai:</strong> Pastikan keempat sudut dokumen terlihat di dalam bingkai kamera, dengan latar belakang berbeda warna dari kertas.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#4B164C] font-bold shrink-0">✋</span>
                    <span><strong>Sudut:</strong> Setelah foto diambil, seret titik sudut untuk menyesuaikan bingkai dokumen jika deteksi otomatis kurang tepat.</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                    <li>Ambil Foto → 2. Sesuaikan sudut → 3. Tinjau hasil → 4. Tambah halaman / Selesai</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-red-600 transition flex items-center justify-center"
            aria-label="Tutup scan kamera"
            title="Tutup"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* ════════ STEP: CAMERA ════════ */}
        {step === 'camera' && (
          <>
            {/* Camera viewport */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
                  <p className="text-sm text-slate-300">Menghubungkan ke kamera...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 z-20">
                  <div className="w-16 h-16 rounded-full bg-red-950/50 flex items-center justify-center text-red-500 mb-4 border border-red-900/30">
                    <i className="bi bi-camera-video-off text-3xl" />
                  </div>
                  <h4 className="text-lg font-semibold text-red-400 mb-2">Akses Kamera Gagal</h4>
                  <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{cameraError}</p>
                  <button
                    onClick={() => startCamera(selectedCamera || undefined)}
                    className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl text-sm font-semibold text-white transition"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {!cameraError && (
                <div className="relative w-full h-full">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {/* Document frame guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-12">
                    <div className="w-full h-full border-2 border-dashed border-purple-400/40 rounded-lg relative max-w-3xl">
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br" />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                        <p className="text-xs text-purple-300 font-medium tracking-wide whitespace-nowrap">
                          Posisikan dokumen di dalam bingkai
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── First-time capture tip overlay ───────────────────────── */}
              {showFirstTimeTip && !cameraError && !cameraLoading && (
                <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-sm">
                  <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-purple-900/50 shadow-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#4B164C] flex items-center justify-center text-yellow-300 text-base shrink-0">
                        💡
                      </div>
                      <h4 className="font-bold text-white text-sm">Tips Scan Dokumen yang Baik</h4>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 leading-relaxed mb-4">
                      <li className="flex items-start gap-2">
                        <span className="shrink-0 text-purple-400 mt-0.5">▸</span>
                        <span>Letakkan dokumen di permukaan datar dengan pencahayaan merata — hindari bayangan di atas halaman.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="shrink-0 text-purple-400 mt-0.5">▸</span>
                        <span>Pegang kamera <strong className="text-white">lurus di atas dokumen</strong> (tegak lurus), bukan dari sudut miring.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="shrink-0 text-purple-400 mt-0.5">▸</span>
                        <span>Pastikan <strong className="text-white">keempat sudut</strong> dokumen terlihat jelas di dalam bingkai.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="shrink-0 text-purple-400 mt-0.5">▸</span>
                        <span>Gunakan latar belakang yang kontras dengan kertas (gelap untuk kertas putih).</span>
                      </li>
                    </ul>
                    <button
                      type="button"
                      onClick={dismissTip}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition"
                      style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                    >
                      Mengerti, Mulai Scan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera controls panel */}
            <div className="flex-none bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 sm:p-6 flex flex-col gap-4 lg:w-64">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Langkah 1</p>
                <h3 className="text-base font-bold text-white">Ambil Foto Dokumen</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Arahkan kamera ke dokumen dan pastikan seluruh dokumen terlihat jelas di dalam bingkai.
                </p>
              </div>

              {/* Capture quality reminder */}
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs text-slate-400 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5"><i className="bi bi-lightbulb text-yellow-400" /> Tips cepat</p>
                <p>📐 Kamera lurus di atas dokumen</p>
                <p>☀️ Cahaya merata, tanpa bayangan</p>
                <p>🖼️ 4 sudut dokumen terlihat</p>
              </div>

              {cameras.length > 1 && (
                <div className="space-y-1">
                  <label htmlFor="camSelect" className="block text-xs font-semibold text-slate-400">Pilih Kamera</label>
                  <select
                    id="camSelect"
                    value={selectedCamera}
                    onChange={(e) => { setSelectedCamera(e.target.value); startCamera(e.target.value); }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  >
                    {cameras.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${cameras.indexOf(d) + 1}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {pages.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Halaman Tersimpan</p>
                  <p className="text-sm font-bold text-purple-300">{pages.length} halaman</p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={cameraLoading || !!cameraError}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg transition min-h-[52px] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                >
                  <i className="bi bi-camera-fill text-lg" />
                  Ambil Foto
                </button>

                {pages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep('pages')}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition min-h-[44px]"
                  >
                    <i className="bi bi-check2-circle" />
                    Selesai ({pages.length} halaman)
                  </button>
                )}

                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition min-h-[44px]"
                >
                  Batal
                </button>
              </div>
            </div>
          </>
        )}

        {/* ════════ STEP: ADJUST ════════ */}
        {step === 'adjust' && (
          <>
            {/* Image + SVG corner overlay */}
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden p-3 sm:p-6">
              <div
                ref={adjustContainerRef}
                className="relative max-w-3xl w-full"
                style={{ aspectRatio: `${imageNaturalSize.w} / ${imageNaturalSize.h}` }}
              >
                {capturedDataUrl && (
                  <img
                    src={capturedDataUrl}
                    alt="Foto yang diambil"
                    className="w-full h-full object-contain rounded-lg shadow-2xl"
                    draggable={false}
                    style={{ display: 'block' }}
                  />
                )}

                {renderedCorners.length === 4 && renderedSize.w > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 ${renderedSize.w} ${renderedSize.h}`}
                    style={{ overflow: 'visible' }}
                  >
                    <polygon
                      points={renderedCorners.map((c) => `${c.x},${c.y}`).join(' ')}
                      fill="rgba(75,22,76,0.15)"
                      stroke="#DD88CF"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                    />
                    {renderedCorners.map((c, i) => (
                      <CornerHandle
                        key={i}
                        cx={c.x}
                        cy={c.y}
                        label={cornerLabels[i]}
                        onDrag={(rx, ry) => updateCorner(i, rx, ry)}
                      />
                    ))}
                  </svg>
                )}
              </div>
            </div>

            {/* Adjust controls panel */}
            <div className="flex-none bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 sm:p-6 flex flex-col gap-4 lg:w-64">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Langkah 2</p>
                <h3 className="text-base font-bold text-white">Sesuaikan Sudut</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Seret titik sudut berwarna ungu ke pojok-pojok dokumen untuk koreksi perspektif yang akurat.
                </p>
              </div>

              {/* Filter selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode Output</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'color', icon: 'bi-palette',   label: 'Warna' },
                    { id: 'bw',    icon: 'bi-file-text', label: 'Hitam-Putih' },
                  ].map(({ id, icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold border transition-all min-h-[60px] ${
                        filter === id
                          ? 'bg-[#4B164C] text-white border-[#4B164C] shadow-md'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      <i className={`bi ${icon} text-base`} />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {filter === 'bw'
                    ? 'Mode Hitam-Putih: kontras adaptif, teks hitam di atas putih, ukuran file lebih kecil.'
                    : 'Mode Warna: normalisasi pencahayaan, mempertahankan warna asli dokumen.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg transition min-h-[52px] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses Scan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic" />
                      Proses & Tinjau
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { capturedCanvasRef.current = null; setCorners(null); setStep('camera'); }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition min-h-[44px]"
                >
                  <i className="bi bi-arrow-repeat" />
                  Foto Ulang
                </button>
              </div>
            </div>
          </>
        )}

        {/* ════════ STEP: PREVIEW ════════ */}
        {step === 'preview' && (
          <>
            {/* Preview image */}
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden p-3 sm:p-6">
              {previewDataUrl ? (
                <div className="relative max-w-3xl w-full flex flex-col items-center gap-3">
                  {/* Quality badge */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 px-3 py-1.5 rounded-full">
                    <i className="bi bi-check-circle-fill" />
                    Hasil koreksi perspektif · {filter === 'bw' ? 'Mode Hitam-Putih' : 'Mode Warna'}
                  </div>
                  <img
                    src={previewDataUrl}
                    alt="Hasil scan"
                    className="max-h-[70vh] w-auto rounded-lg shadow-2xl border border-slate-700"
                    style={{ display: 'block' }}
                  />
                  <p className="text-xs text-slate-500 text-center">
                    Ini adalah tampilan hasil scan setelah koreksi perspektif dan peningkatan kualitas gambar.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin w-10 h-10 text-purple-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Preview controls */}
            <div className="flex-none bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 sm:p-6 flex flex-col gap-4 lg:w-64">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Langkah 3</p>
                <h3 className="text-base font-bold text-white">Tinjau Hasil Scan</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Periksa kualitas hasil scan. Jika sudah baik, terima halaman ini. Jika tidak, kembali dan sesuaikan sudut.
                </p>
              </div>

              {/* Quality checklist */}
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 space-y-2 text-xs text-slate-400">
                <p className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1">Periksa kualitas:</p>
                {[
                  'Dokumen terlihat lurus (tidak miring)',
                  'Teks terbaca jelas',
                  'Tidak ada latar belakang/meja yang tampak',
                  filter === 'bw' ? 'Teks hitam di atas latar putih bersih' : 'Warna dokumen natural',
                ].map((check, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <i className="bi bi-square text-slate-600 text-[10px] mt-0.5 shrink-0" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  type="button"
                  onClick={handleAcceptPage}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg transition min-h-[52px]"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                >
                  <i className="bi bi-check2-circle text-lg" />
                  Terima Halaman
                </button>

                <button
                  type="button"
                  onClick={handleRetryAdjust}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition min-h-[44px]"
                >
                  <i className="bi bi-arrow-left" />
                  Ubah Sudut
                </button>

                <button
                  type="button"
                  onClick={() => { capturedCanvasRef.current = null; setCorners(null); setPreviewCanvas(null); setPreviewDataUrl(null); setStep('camera'); }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-slate-800 text-slate-500 hover:text-slate-300 text-sm font-semibold transition min-h-[44px]"
                >
                  <i className="bi bi-arrow-repeat" />
                  Foto Ulang
                </button>
              </div>
            </div>
          </>
        )}

        {/* ════════ STEP: PAGES ════════ */}
        {step === 'pages' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-4 sm:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Langkah 4</p>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Dokumen Siap — {pages.length} Halaman
                  </h3>
                  <p className="text-sm text-slate-400">
                    Tambah halaman baru atau klik Selesai untuk menghasilkan PDF dan melanjutkan pengisian form.
                  </p>
                </div>

                {assembleError && (
                  <div className="mb-4 p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm flex items-start gap-3">
                    <i className="bi bi-exclamation-triangle-fill text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{assembleError}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 justify-start">
                  {pages.map((canvas, idx) => (
                    <PageThumbnail
                      key={idx}
                      canvas={canvas}
                      index={idx}
                      totalPages={pages.length}
                      onRemove={() => handleRemovePage(idx)}
                      onMoveLeft={() => handleMovePage(idx, idx - 1)}
                      onMoveRight={() => handleMovePage(idx, idx + 1)}
                    />
                  ))}
                </div>

                {pages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                    <i className="bi bi-file-earmark-x text-5xl mb-3" />
                    <p className="text-sm">Semua halaman dihapus. Tambah halaman baru.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="flex-none bg-slate-900 border-t border-slate-800 px-4 py-4 sm:px-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleAddPage}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition min-h-[48px]"
              >
                <i className="bi bi-plus-circle text-lg" />
                Tambah Halaman
              </button>

              <span className="flex-1 hidden sm:block" />

              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition min-h-[48px]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleFinish}
                disabled={assembling || pages.length === 0}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white text-sm font-bold shadow-lg transition min-h-[48px] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
              >
                {assembling ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Membuat PDF...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-pdf-fill text-lg" />
                    Selesai &amp; Buat PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
