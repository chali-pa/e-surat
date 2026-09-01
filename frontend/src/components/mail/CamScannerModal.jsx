/**
 * CamScannerModal.jsx
 *
 * Full-screen CamScanner-style document capture modal.
 *
 * Flow:
 *   camera  →  adjust (corner handles)  →  preview/filter  →  page-list  →  finish → PDF blob
 *
 * Client-side operations only (no server round-trips for image processing):
 *   - Edge detection via canvas contrast analysis
 *   - Perspective correction via projective transform on canvas
 *   - B&W filter via adaptive threshold on canvas
 *   - Multi-page PDF assembly via pdf-lib
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { MAX_MAIL_UPLOAD_SIZE_MB } from '../../config/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTPUT_WIDTH  = 1240; // px — A4-ish output width for processed images
const OUTPUT_HEIGHT = 1754; // px — A4-ish output height

// ─── Pure utility functions ────────────────────────────────────────────────────

/**
 * Simple Sobel-based edge map on a grayscale image.
 * Returns a Float32Array of edge magnitudes (0..1), same size as w×h.
 */
function computeEdgeMagnitude(grayData, w, h) {
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -grayData[(y - 1) * w + (x - 1)] - 2 * grayData[y * w + (x - 1)] - grayData[(y + 1) * w + (x - 1)] +
         grayData[(y - 1) * w + (x + 1)] + 2 * grayData[y * w + (x + 1)] + grayData[(y + 1) * w + (x + 1)];
      const gy =
        -grayData[(y - 1) * w + (x - 1)] - 2 * grayData[(y - 1) * w + x] - grayData[(y - 1) * w + (x + 1)] +
         grayData[(y + 1) * w + (x - 1)] + 2 * grayData[(y + 1) * w + x] + grayData[(y + 1) * w + (x + 1)];
      edges[idx] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 255);
    }
  }
  return edges;
}

/**
 * Find document corners from a canvas element.
 * Returns [{x,y}, {x,y}, {x,y}, {x,y}] as [tl, tr, br, bl] in pixel coordinates.
 * Falls back to a sensible inset rectangle if detection fails.
 */
function detectDocumentCorners(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Convert to grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Downsample to speed up edge processing (max 400px wide)
  const scale = Math.min(1, 400 / w);
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const downGray = new Float32Array(sw * sh);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const srcX = Math.round(x / scale);
      const srcY = Math.round(y / scale);
      downGray[y * sw + x] = gray[Math.min(w * h - 1, srcY * w + srcX)];
    }
  }

  const edges = computeEdgeMagnitude(downGray, sw, sh);

  // Find bounding box of strong edge region, excluding outer 5% border
  const margin = 0.05;
  const threshold = 0.15;

  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  let found = false;

  for (let y = Math.round(sh * margin); y < Math.round(sh * (1 - margin)); y++) {
    for (let x = Math.round(sw * margin); x < Math.round(sw * (1 - margin)); x++) {
      if (edges[y * sw + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // Scale detected box back to original image coordinates
  if (!found || maxX - minX < sw * 0.1 || maxY - minY < sh * 0.1) {
    // Fallback: 10% inset rectangle
    return [
      { x: w * 0.1, y: h * 0.1 },
      { x: w * 0.9, y: h * 0.1 },
      { x: w * 0.9, y: h * 0.9 },
      { x: w * 0.1, y: h * 0.9 },
    ];
  }

  // Add a small padding outward
  const pad = 8 / scale;
  return [
    { x: Math.max(0, minX / scale - pad), y: Math.max(0, minY / scale - pad) },
    { x: Math.min(w, maxX / scale + pad), y: Math.max(0, minY / scale - pad) },
    { x: Math.min(w, maxX / scale + pad), y: Math.min(h, maxY / scale + pad) },
    { x: Math.max(0, minX / scale - pad), y: Math.min(h, maxY / scale + pad) },
  ];
}

/**
 * Perspective-correct a canvas using 4 source corner points → a rectangular output.
 * Uses a scanline bilinear-interpolation approach (pure JS, no WebGL).
 * Returns a new HTMLCanvasElement of OUTPUT_WIDTH × OUTPUT_HEIGHT.
 */
function applyPerspectiveTransform(srcCanvas, corners) {
  const [tl, tr, br, bl] = corners;

  const dst = document.createElement('canvas');
  dst.width  = OUTPUT_WIDTH;
  dst.height = OUTPUT_HEIGHT;
  const dstCtx = dst.getContext('2d');

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;

  const srcCtx = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const src = srcData.data;

  const dstData = dstCtx.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const dst_ = dstData.data;

  // For each destination pixel, compute its source coordinate via inverse bilinear map
  for (let dy = 0; dy < OUTPUT_HEIGHT; dy++) {
    const v = dy / (OUTPUT_HEIGHT - 1);
    for (let dx = 0; dx < OUTPUT_WIDTH; dx++) {
      const u = dx / (OUTPUT_WIDTH - 1);

      // Bilinear interpolation of source coordinates
      const sx = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x;
      const sy = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y;

      const sx0 = Math.floor(sx), sy0 = Math.floor(sy);
      const sx1 = Math.min(sx0 + 1, srcW - 1), sy1 = Math.min(sy0 + 1, srcH - 1);
      const fx = sx - sx0, fy = sy - sy0;

      const clampSX0 = Math.max(0, Math.min(srcW - 1, sx0));
      const clampSY0 = Math.max(0, Math.min(srcH - 1, sy0));
      const clampSX1 = Math.max(0, Math.min(srcW - 1, sx1));
      const clampSY1 = Math.max(0, Math.min(srcH - 1, sy1));

      const i00 = (clampSY0 * srcW + clampSX0) * 4;
      const i10 = (clampSY0 * srcW + clampSX1) * 4;
      const i01 = (clampSY1 * srcW + clampSX0) * 4;
      const i11 = (clampSY1 * srcW + clampSX1) * 4;

      const dstIdx = (dy * OUTPUT_WIDTH + dx) * 4;
      for (let c = 0; c < 3; c++) {
        dst_[dstIdx + c] = Math.round(
          (1 - fx) * (1 - fy) * src[i00 + c] +
          fx       * (1 - fy) * src[i10 + c] +
          (1 - fx) * fy       * src[i01 + c] +
          fx       * fy       * src[i11 + c]
        );
      }
      dst_[dstIdx + 3] = 255;
    }
  }

  dstCtx.putImageData(dstData, 0, 0);
  return dst;
}

/**
 * Apply B&W (high-contrast document mode) or pass-through color filter.
 * Returns a new canvas with the filter applied.
 */
function applyFilter(srcCanvas, mode) {
  const dst = document.createElement('canvas');
  dst.width  = srcCanvas.width;
  dst.height = srcCanvas.height;
  const dstCtx = dst.getContext('2d');

  if (mode === 'color') {
    dstCtx.drawImage(srcCanvas, 0, 0);
    return dst;
  }

  // B&W adaptive threshold
  const ctx = srcCanvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const data = imgData.data;
  const outData = dstCtx.createImageData(srcCanvas.width, srcCanvas.height);
  const out = outData.data;

  const w = srcCanvas.width;
  const h = srcCanvas.height;

  // Convert to grayscale first
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // Simple adaptive threshold (Otsu-like: global mean threshold with contrast boost)
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const mean = sum / gray.length;

  // Contrast-enhance then threshold
  for (let i = 0; i < w * h; i++) {
    // Contrast stretch: push values away from mean
    const enhanced = Math.max(0, Math.min(255, (gray[i] - mean) * 2.2 + mean));
    const bw = enhanced > mean * 0.9 ? 255 : 0;
    const idx = i * 4;
    out[idx] = out[idx + 1] = out[idx + 2] = bw;
    out[idx + 3] = 255;
  }

  dstCtx.putImageData(outData, 0, 0);
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
    const base64 = jpegDataUrl.split(',')[1];
    const jpegBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const jpegImage = await pdfDoc.embedJpg(jpegBytes);
    const { width, height } = jpegImage.scale(1);

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(jpegImage, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  return new File([pdfBytes], `scan_${timestamp}.pdf`, { type: 'application/pdf' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Corner handle — a draggable SVG circle for adjusting perspective corners.
 */
function CornerHandle({ cx, cy, onDrag, label }) {
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX  = cx;
    const origY  = cy;

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      onDrag(origX + dx, origY + dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [cx, cy, onDrag]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const origX  = cx;
    const origY  = cy;

    const onMove = (te) => {
      const t = te.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      onDrag(origX + dx, origY + dy);
    };
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [cx, cy, onDrag]);

  return (
    <g
      style={{ cursor: 'grab', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
    >
      {/* Shadow */}
      <circle cx={cx + 1} cy={cy + 1} r={18} fill="rgba(0,0,0,0.3)" />
      {/* Main handle */}
      <circle cx={cx} cy={cy} r={17} fill="#4B164C" stroke="white" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={6} fill="white" />
      <text x={cx} y={cy - 22} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
        {label}
      </text>
    </g>
  );
}

/**
 * Page thumbnail card in the page list.
 */
function PageThumbnail({ canvas, index, onRemove }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !canvas) return;
    const ctx = el.getContext('2d');
    el.width  = canvas.width;
    el.height = canvas.height;
    ctx.drawImage(canvas, 0, 0);
  }, [canvas]);

  return (
    <div className="relative group flex-shrink-0 w-20 sm:w-24">
      <div className="rounded-lg overflow-hidden border-2 border-purple-200 shadow-md bg-white aspect-[210/297]">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      </div>
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-[#4B164C] text-white text-xs font-bold flex items-center justify-center shadow-md">
        {index + 1}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        title="Hapus halaman ini"
        aria-label={`Hapus halaman ${index + 1}`}
      >
        <i className="bi bi-x" />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * CamScannerModal
 *
 * Props:
 *   onComplete(file: File) — called with the final assembled PDF file
 *   onCancel()             — called when the user dismisses without finishing
 */
export default function CamScannerModal({ onComplete, onCancel }) {
  // ── Step state ────────────────────────────────────────────────────────────
  // 'camera' | 'adjust' | 'pages'
  const [step, setStep] = useState('camera');

  // ── Camera ────────────────────────────────────────────────────────────────
  const videoRef           = useRef(null);
  const streamRef          = useRef(null);
  const capturedCanvasRef  = useRef(null); // raw captured image canvas
  const [cameras, setCameras]           = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraError, setCameraError]   = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  // ── Adjust step ────────────────────────────────────────────────────────────
  const [corners, setCorners]   = useState(null); // [{x,y}×4]: tl,tr,br,bl
  const [filter, setFilter]     = useState('color'); // 'color' | 'bw'
  const [processing, setProcessing] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 1, h: 1 });
  const adjustImgRef = useRef(null); // the <img> or canvas element in adjust step

  // ── Pages list ────────────────────────────────────────────────────────────
  const [pages, setPages]       = useState([]); // array of processed HTMLCanvasElement
  const [assembling, setAssembling] = useState(false);
  const [assembleError, setAssembleError] = useState(null);

  // ── Help tooltip ──────────────────────────────────────────────────────────
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

      const devices = await navigator.mediaDevices.enumerateDevices();
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

  // Start camera when mounting or when returning to camera step
  useEffect(() => {
    if (step === 'camera') {
      startCamera(selectedCamera || undefined);
    }
    return () => {
      if (step === 'camera') stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ─── Capture photo ────────────────────────────────────────────────────────

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    capturedCanvasRef.current = canvas;
    setImageNaturalSize({ w, h });

    // Detect corners
    const detectedCorners = detectDocumentCorners(canvas);
    setCorners(detectedCorners);

    stopCamera();
    setStep('adjust');
  }, [stopCamera]);

  // ─── Adjust step: update individual corner ─────────────────────────────────

  /**
   * Convert corners from image-pixel space to rendered-element space for SVG overlay,
   * and back. We need the rendered size of the image element.
   */
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0 });
  const adjustContainerRef = useRef(null);

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

  // Scale factor: image-pixel → rendered-pixel
  const scaleX = renderedSize.w / imageNaturalSize.w;
  const scaleY = renderedSize.h / imageNaturalSize.h;

  // Rendered corners (in SVG coordinate space)
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

  // ─── Process page ─────────────────────────────────────────────────────────

  const handleProcess = useCallback(async () => {
    if (!capturedCanvasRef.current || !corners) return;
    setProcessing(true);
    try {
      // Run heavy canvas work in a setTimeout to not block the UI thread
      await new Promise((resolve) => setTimeout(resolve, 30));
      const corrected = applyPerspectiveTransform(capturedCanvasRef.current, corners);
      const filtered  = applyFilter(corrected, filter);
      setPages((prev) => [...prev, filtered]);
      setStep('pages');
    } finally {
      setProcessing(false);
    }
  }, [corners, filter]);

  // ─── Remove page ──────────────────────────────────────────────────────────

  const handleRemovePage = useCallback((idx) => {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── Add another page ─────────────────────────────────────────────────────

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
      const pdfFile = await assemblePagesToPdf(pages);

      // Enforce 50 MB limit
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

  // ─── Help tooltip ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-scan-help]')) setHelpOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [helpOpen]);

  // ─── Step label ──────────────────────────────────────────────────────────

  const stepLabel = step === 'camera'
    ? { num: 1, text: 'Ambil Foto' }
    : step === 'adjust'
    ? { num: 2, text: 'Sesuaikan Sudut' }
    : { num: 3, text: 'Halaman Tersimpan' };

  // ─── Rendered capture image (for adjust step) ─────────────────────────────

  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  useEffect(() => {
    if (step === 'adjust' && capturedCanvasRef.current) {
      setCapturedDataUrl(capturedCanvasRef.current.toDataURL('image/jpeg', 0.8));
    }
  }, [step]);

  // ─── Corner labels ────────────────────────────────────────────────────────

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
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                stepLabel.num === n
                  ? 'bg-[#4B164C] text-white shadow-md shadow-purple-900/40'
                  : stepLabel.num > n
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {stepLabel.num > n ? <i className="bi bi-check text-xs" /> : n}
              </span>
              <span className={`text-xs font-semibold hidden sm:inline ${
                stepLabel.num === n ? 'text-white' : stepLabel.num > n ? 'text-emerald-400' : 'text-slate-600'
              }`}>
                {n === 1 ? 'Ambil Foto' : n === 2 ? 'Sesuaikan' : 'Selesai'}
              </span>
              {n < 3 && <span className="text-slate-700 text-xs hidden sm:inline">›</span>}
            </div>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Help */}
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
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 text-slate-800">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-[#4B164C]">
                  <i className="bi bi-camera-fill" /> Cara Scan Dokumen
                </h4>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Arahkan kamera ke dokumen dan klik <strong>Ambil Foto</strong>.</li>
                  <li>Seret titik sudut untuk menyesuaikan bingkai dokumen jika perlu.</li>
                  <li>Pilih mode <strong>Warna</strong> atau <strong>Hitam-Putih</strong>, lalu klik <strong>Proses</strong>.</li>
                  <li>Tambah halaman berikutnya atau klik <strong>Selesai</strong> untuk menghasilkan PDF.</li>
                </ol>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-2">
                  Dokumen akan disimpan sebagai PDF dan langsung terlampir ke form tambah surat.
                </p>
              </div>
            )}
          </div>

          {/* Close */}
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

      {/* ── Main content area ─────────────────────────────────────────────── */}
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
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
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

              {cameras.length > 1 && (
                <div className="space-y-1">
                  <label htmlFor="camSelect" className="block text-xs font-semibold text-slate-400">
                    Pilih Kamera
                  </label>
                  <select
                    id="camSelect"
                    value={selectedCamera}
                    onChange={(e) => { setSelectedCamera(e.target.value); startCamera(e.target.value); }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  >
                    {cameras.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Kamera ${cameras.indexOf(d) + 1}`}
                      </option>
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
            {/* Image + SVG overlay */}
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden p-3 sm:p-6">
              <div
                ref={adjustContainerRef}
                className="relative max-w-3xl w-full"
                style={{ aspectRatio: `${imageNaturalSize.w} / ${imageNaturalSize.h}` }}
              >
                {capturedDataUrl && (
                  <img
                    ref={adjustImgRef}
                    src={capturedDataUrl}
                    alt="Foto yang diambil"
                    className="w-full h-full object-contain rounded-lg shadow-2xl"
                    draggable={false}
                    style={{ display: 'block' }}
                  />
                )}

                {/* SVG overlay for corners */}
                {renderedCorners.length === 4 && renderedSize.w > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 ${renderedSize.w} ${renderedSize.h}`}
                    style={{ overflow: 'visible' }}
                  >
                    {/* Polygon fill */}
                    <polygon
                      points={renderedCorners.map((c) => `${c.x},${c.y}`).join(' ')}
                      fill="rgba(75,22,76,0.15)"
                      stroke="#DD88CF"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                    />
                    {/* Corner handles */}
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode Filter</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'color', icon: 'bi-palette', label: 'Warna' },
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
                    ? 'Mode Hitam-Putih meningkatkan kontras teks dan menghasilkan file lebih kecil.'
                    : 'Mode Warna mempertahankan foto dan grafik berwarna dalam dokumen.'}
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
                      Memproses...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-square" />
                      Proses
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

        {/* ════════ STEP: PAGES ════════ */}
        {step === 'pages' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Page list */}
            <div className="flex-1 overflow-auto p-4 sm:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Langkah 3</p>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Dokumen Siap — {pages.length} Halaman
                  </h3>
                  <p className="text-sm text-slate-400">
                    Tambah halaman baru atau klik Selesai untuk menghasilkan PDF dan melanjutkan pengisian form.
                  </p>
                </div>

                {/* Error */}
                {assembleError && (
                  <div className="mb-4 p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm flex items-start gap-3">
                    <i className="bi bi-exclamation-triangle-fill text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{assembleError}</span>
                  </div>
                )}

                {/* Thumbnails grid */}
                <div className="flex flex-wrap gap-4 justify-start">
                  {pages.map((canvas, idx) => (
                    <PageThumbnail
                      key={idx}
                      canvas={canvas}
                      index={idx}
                      onRemove={() => handleRemovePage(idx)}
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
