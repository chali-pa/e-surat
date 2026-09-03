/**
 * CamScannerModal.jsx
 *
 * Full-screen CamScanner-style document capture modal.
 *
 * Pipeline (all client-side, no server round-trips):
 *   camera → adjust (corner handles) → preview (corrected result) → page-list → finish → PDF blob
 *
 * Processing engine: OpenCV.js (@techstark/opencv-js v5 WASM build)
 *   Loaded lazily (only when this modal mounts) via useOpenCV() hook.
 *   A loading overlay blocks capture interactions until OpenCV is ready.
 *
 *  Step 1 — Edge/boundary detection
 *            detectCorners() from opencvPipeline.js:
 *            grayscale → GaussianBlur → Canny → findContours → approxPolyDP
 *            (via opencv-document-scanner@1.2.2 DocumentScanner.detect())
 *
 *  Step 2 — Perspective correction
 *            perspectiveCorrect() from opencvPipeline.js:
 *            OpenCV getPerspectiveTransform + warpPerspective
 *
 *  Step 3 — Sharpening
 *            sharpen() via applyEnhancement(): cv.filter2D with 3×3 unsharp kernel
 *
 *  Step 4 — Lighting normalization / Enhancement
 *            Color → enhanceColor(): CLAHE on L channel (LAB) + NORM_MINMAX auto-levels
 *            B&W   → enhanceBW(): cv.medianBlur denoising + cv.adaptiveThreshold
 *
 *  Step 5 — Multi-page PDF via pdf-lib (unchanged)
 *
 * Integration approach used:
 *   • @techstark/opencv-js@5.0.0-release.1 — full OpenCV WASM build (cv.* API)
 *   • opencv-document-scanner@1.2.2       — DocumentScanner helper for detect/crop
 *   • react-opencv-document-scanner        — does NOT exist (404); not used
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { MAX_MAIL_UPLOAD_SIZE_MB } from '../../config/constants';
import { calculateTargetOutputDimensions, validateQuadGeometry } from '../../utils/documentGeometryUtils';
import { useOpenCV } from '../../hooks/useOpenCV';
import {
  detectCorners,
  perspectiveCorrect,
  rotateCanvas,
  applyEnhancement,
} from '../../utils/opencvPipeline';

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTPUT_HEIGHT = 1754; // A4-ish max dimension @ ~150 DPI
const TIP_SEEN_KEY  = 'camscanner_capture_tip_seen';

/**
 * How often (ms) to sample a frame from the live video and run edge detection.
 * 350 ms gives ~2–3 detections/second — responsive enough to feel live,
 * light enough not to saturate a mid-range mobile CPU.
 */
const LIVE_DETECT_INTERVAL_MS = 350;

// ─── PDF assembly (unchanged) ─────────────────────────────────────────────────

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

  // ── OpenCV loading state ──────────────────────────────────────────────────
  // cv is null until the WASM module is fully initialized.
  // loading=true prevents capture until OpenCV is ready.
  const { cv, loading: cvLoading, error: cvError } = useOpenCV();

  // Keep cv in a ref so live-detection interval can always read the latest
  // value without needing to re-register the interval when cv changes.
  const cvRef = useRef(null);
  useEffect(() => { cvRef.current = cv; }, [cv]);

  // ── Step: 'camera' | 'adjust' | 'preview' | 'pages' ─────────────────────
  const [step, setStep] = useState('camera');

  // ── Camera ───────────────────────────────────────────────────────────────
  const videoRef          = useRef(null);
  const streamRef         = useRef(null);
  const capturedCanvasRef = useRef(null); // raw captured image canvas

  // ── Tracks whether the active camera is front-facing ('user') ────────────
  // Used to:
  //   (a) apply CSS scaleX(-1) on the <video> preview so it looks natural
  //       (mirror-like) for the user — purely cosmetic, does NOT affect drawImage.
  //   (b) flip the captured canvas horizontally at the raw-capture stage so
  //       the saved image is never mirrored regardless of which camera is used.
  //   (c) flip the live-detection scratch canvas the same way so the overlay
  //       corner coords always match the corrected capture orientation.
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  // Keep a ref in sync so the live-detection interval can always read the
  // current value without the interval needing to be re-registered on change.
  useEffect(() => { isFrontCameraRef.current = isFrontCamera; }, [isFrontCamera]);

  // ── Live edge-detection overlay ────────────────────────────────────────────
  // A canvas rendered on top of the video, updated every LIVE_DETECT_INTERVAL_MS.
  // Only drawn when detection is confident (all 4 corners found, not fallback).
  const liveOverlayCanvasRef = useRef(null);
  const liveDetectTimerRef   = useRef(null);
  const isFrontCameraRef     = useRef(false); // mirror of isFrontCamera state for interval access
  const [liveDetected, setLiveDetected] = useState(false); // true when confident outline visible

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
  const [rotationSteps, setRotationSteps]   = useState(0); // 0–3, clockwise 90° increments
  const adjustContainerRef = useRef(null);

  // ── Preview step ─────────────────────────────────────────────────────────
  const [previewCanvas, setPreviewCanvas] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  // When true, the preview image fills the screen so the user can inspect
  // fine detail (text quality, corner accuracy) before accepting the page.
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false);

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

      // Detect facing mode from the active video track's capabilities/settings.
      const videoTrack = stream.getVideoTracks()[0];
      let detectedFacing = 'environment';
      if (videoTrack) {
        const settings     = videoTrack.getSettings?.()     || {};
        const capabilities = videoTrack.getCapabilities?.() || {};
        const facing = settings.facingMode || capabilities.facingMode;
        if (Array.isArray(facing)) {
          detectedFacing = facing[0] ?? 'environment';
        } else if (facing) {
          detectedFacing = facing;
        }
      }
      setIsFrontCamera(detectedFacing === 'user');

      const devices      = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);

      if (!deviceId && videoDevices.length > 0) {
        const activeLabel = videoTrack?.label;
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

  // ─── Live document-boundary overlay ─────────────────────────────────────
  //
  // While the camera step is active and the video is playing, sample one frame
  // every LIVE_DETECT_INTERVAL_MS, run detectCorners() (OpenCV Canny+findContours)
  // on a small canvas, and draw the detected quad onto liveOverlayCanvasRef.
  //
  // Performance notes:
  //   • Detection runs on a 320-wide thumbnail — same as the previous impl.
  //   • OpenCV WASM findContours is significantly faster than the hand-rolled
  //     Sobel edge map + per-pixel scoring loop it replaces.
  //   • The interval guard `if (!cvRef.current) return` means detection is
  //     silently skipped while OpenCV is still loading — no errors, no overlay.
  //   • The interval is fully cleared when the component leaves camera step or
  //     unmounts, ensuring zero background work in other steps.

  useEffect(() => {
    if (step !== 'camera') {
      if (liveDetectTimerRef.current) {
        clearInterval(liveDetectTimerRef.current);
        liveDetectTimerRef.current = null;
      }
      setLiveDetected(false);
      return;
    }

    // Offscreen scratch canvas — reused every tick to avoid GC pressure
    const scratch = document.createElement('canvas');

    const runDetection = () => {
      const currentCv = cvRef.current;
      const video     = videoRef.current;
      const overlay   = liveOverlayCanvasRef.current;

      // Skip if OpenCV not yet ready or video not streaming
      if (!currentCv || !video || !overlay || video.readyState < 2 || video.videoWidth === 0) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Downscale to at most 320px wide for speed
      const scale  = Math.min(1, 320 / vw);
      const sw     = Math.round(vw * scale);
      const sh     = Math.round(vh * scale);
      scratch.width  = sw;
      scratch.height = sh;

      const sCtx = scratch.getContext('2d');

      // Apply the same horizontal flip used at capture time so that detected
      // corner coords are in the corrected (non-mirrored) coordinate space.
      if (isFrontCameraRef.current) {
        sCtx.translate(sw, 0);
        sCtx.scale(-1, 1);
      }
      sCtx.drawImage(video, 0, 0, sw, sh);
      if (isFrontCameraRef.current) {
        sCtx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // OpenCV-based corner detection (Canny + findContours + approxPolyDP)
      const { corners: detectedCorners, confident } = detectCorners(scratch, currentCv);
      setLiveDetected(confident);

      const oCtx = overlay.getContext('2d');
      const dispW = overlay.clientWidth  || vw;
      const dispH = overlay.clientHeight || vh;
      overlay.width  = dispW;
      overlay.height = dispH;
      oCtx.clearRect(0, 0, dispW, dispH);

      if (!confident) return;

      // Compute object-fit: cover scaling and cropping offsets
      const videoRatio   = vw / vh;
      const elementRatio = dispW / dispH;

      let scaleRatio, renderW, renderH, offsetX, offsetY;
      if (videoRatio > elementRatio) {
        scaleRatio = dispH / vh;
        renderW = vw * scaleRatio;
        renderH = dispH;
        offsetX = (renderW - dispW) / 2;
        offsetY = 0;
      } else {
        scaleRatio = dispW / vw;
        renderW = dispW;
        renderH = vh * scaleRatio;
        offsetX = 0;
        offsetY = (renderH - dispH) / 2;
      }

      // Map corners from scratch-canvas coords (sw, sh) → overlay CSS coords
      const pts = detectedCorners.map((c) => ({
        x: (c.x / scale) * scaleRatio - offsetX,
        y: (c.y / scale) * scaleRatio - offsetY,
      }));

      // Filled polygon with semi-transparent purple fill
      oCtx.beginPath();
      oCtx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => oCtx.lineTo(p.x, p.y));
      oCtx.closePath();
      oCtx.fillStyle   = 'rgba(75, 22, 76, 0.18)';
      oCtx.fill();

      // Stroke edges — bright emerald so it's readable on any doc colour
      oCtx.beginPath();
      oCtx.moveTo(pts[0].x, pts[0].y);
      pts.forEach((p) => oCtx.lineTo(p.x, p.y));
      oCtx.closePath();
      oCtx.strokeStyle = 'rgba(74, 222, 128, 0.90)'; // emerald-400
      oCtx.lineWidth   = 2.5;
      oCtx.setLineDash([]);
      oCtx.stroke();

      // Corner dots
      pts.forEach((p) => {
        oCtx.beginPath();
        oCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        oCtx.fillStyle   = '#4ade80'; // emerald-400
        oCtx.fill();
        oCtx.strokeStyle = 'white';
        oCtx.lineWidth   = 2;
        oCtx.stroke();
      });
    };

    liveDetectTimerRef.current = setInterval(runDetection, LIVE_DETECT_INTERVAL_MS);

    return () => {
      clearInterval(liveDetectTimerRef.current);
      liveDetectTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Capture photo ────────────────────────────────────────────────────────
  //
  // Draws the current video frame onto an off-screen canvas at full native
  // resolution, then runs OpenCV corner detection on that canvas.
  //
  // Mirror correction: when the active camera is front-facing, we flip the
  // canvas horizontally so the saved image is never mirrored.

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280, h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (isFrontCamera) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    if (isFrontCamera) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    capturedCanvasRef.current = canvas;
    setImageNaturalSize({ w, h });

    // OpenCV-based corner detection for the still image
    const { corners: detectedCorners } = detectCorners(canvas, cvRef.current);
    setCorners(detectedCorners);
    setRotationSteps(0);

    stopCamera();
    setStep('adjust');
  }, [stopCamera, isFrontCamera]);

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

      // Validate quadrilateral geometry before transform
      const geomVal = validateQuadGeometry(
        corners,
        capturedCanvasRef.current.width,
        capturedCanvasRef.current.height
      );
      if (!geomVal.isValid) {
        console.warn('[CamScanner] Quad geometry validation warning:', geomVal.errors);
      }

      // 1. Compute output dimensions (preserves true document aspect ratio)
      const target = calculateTargetOutputDimensions(corners, OUTPUT_HEIGHT);

      // 2. Perspective correction using OpenCV getPerspectiveTransform + warpPerspective
      const corrected = perspectiveCorrect(
        capturedCanvasRef.current,
        corners,
        target.outW,
        target.outH,
        cvRef.current
      );

      // 3. Manual orientation rotation (0/90/180/270° CW)
      const rotated = rotationSteps !== 0 ? rotateCanvas(corrected, rotationSteps) : corrected;

      // Yield between heavy steps to avoid complete UI lock
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 4. Enhancement: sharpen + color normalization (CLAHE) or BW adaptive threshold
      const finalResult = applyEnhancement(rotated, filter, cvRef.current);

      setPreviewCanvas(finalResult);
      setPreviewDataUrl(finalResult.toDataURL('image/jpeg', 0.88));
      setStep('preview');
    } finally {
      setProcessing(false);
    }
  }, [corners, filter, rotationSteps]);

  // ─── Rotate preview in-place (from preview step) ─────────────────────────

  const handleRotatePreview = useCallback((steps) => {
    setPreviewCanvas((prev) => {
      if (!prev) return prev;
      const rotated = rotateCanvas(prev, steps);
      setPreviewDataUrl(rotated.toDataURL('image/jpeg', 0.88));
      return rotated;
    });
  }, []);

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

  // Whether capture interactions should be blocked
  // (camera still loading, camera error, OR OpenCV not yet ready)
  const captureBlocked = cameraLoading || !!cameraError || cvLoading;

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
            {/*
              Layout strategy:
              ─ lg+ (desktop): flex-row — video fills left flex-1, controls in right w-64 panel.
              ─ < lg (mobile): video + overlay fill the entire flex-1 area; the controls panel
                is hidden from flow and replaced by an absolutely-positioned overlay bar at the
                bottom of the viewport area. This maximises the viewfinder on small screens and
                keeps all controls reachable without scrolling.
            */}

            {/* Camera viewport — fills ALL available space on mobile */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
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
                  {/* Live video feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{
                      display: 'block',
                      transform: isFrontCamera ? 'scaleX(-1)' : 'none',
                    }}
                  />

                  {/* Live edge-detection overlay canvas */}
                  <canvas
                    ref={liveOverlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ display: 'block' }}
                    aria-hidden="true"
                  />

                  {/* Document frame guide — subtle dashed border for framing */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-12 lg:p-8">
                    <div className="w-full h-full border-2 border-dashed border-white/20 rounded-lg relative max-w-3xl">
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br" />
                      {/* Framing hint — only shown when no doc detected yet */}
                      {!liveDetected && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                          <p className="text-xs text-purple-300 font-medium tracking-wide whitespace-nowrap">
                            Posisikan dokumen di dalam bingkai
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live detection status badge */}
                  {liveDetected && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                      <div className="flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                        Dokumen terdeteksi
                      </div>
                    </div>
                  )}

                  {/* OpenCV loading overlay — blocks capture until engine is ready */}
                  {cvLoading && !cameraLoading && !cameraError && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400" />
                        <p className="text-sm text-slate-300 font-medium">Memuat mesin pemrosesan...</p>
                        <p className="text-xs text-slate-500">Mohon tunggu sebentar</p>
                      </div>
                    </div>
                  )}

                  {/* OpenCV load error overlay */}
                  {cvError && !cameraError && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
                      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-900 border border-red-800 shadow-2xl max-w-sm text-center">
                        <i className="bi bi-exclamation-triangle-fill text-red-400 text-3xl" />
                        <p className="text-sm text-red-300 font-medium">{cvError}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Mobile overlay controls bar (hidden on lg+) ───────── */}
                  <div className="absolute bottom-0 left-0 right-0 lg:hidden z-10">
                    <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent px-5 pt-8 pb-safe-or-5 pb-5 flex flex-col gap-3">

                      {/* Camera selector (compact) */}
                      {cameras.length > 1 && (
                        <div className="flex justify-center">
                          <select
                            value={selectedCamera}
                            onChange={(e) => { setSelectedCamera(e.target.value); startCamera(e.target.value); }}
                            className="bg-black/70 backdrop-blur-sm border border-white/20 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400 max-w-xs w-full"
                            aria-label="Pilih kamera"
                          >
                            {cameras.map((d, i) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Kamera ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Pages saved indicator */}
                      {pages.length > 0 && (
                        <div className="flex justify-center">
                          <span className="text-xs text-purple-300 font-semibold bg-purple-950/70 backdrop-blur-sm border border-purple-700/60 px-3 py-1.5 rounded-full">
                            {pages.length} halaman tersimpan
                          </span>
                        </div>
                      )}

                      {/* Main action row */}
                      <div className="flex items-center justify-center gap-4">

                        {/* Cancel / back */}
                        <button
                          type="button"
                          onClick={onCancel}
                          className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition hover:bg-white/10"
                          aria-label="Batal"
                          title="Batal"
                        >
                          <i className="bi bi-x-lg text-lg" />
                        </button>

                        {/* Capture button — large, easy to tap */}
                        <button
                          type="button"
                          onClick={handleCapture}
                          disabled={captureBlocked}
                          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-2xl transition active:scale-95 disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                          aria-label="Ambil foto"
                          title={cvLoading ? 'Memuat mesin pemrosesan...' : 'Ambil Foto'}
                        >
                          <i className="bi bi-camera-fill text-3xl text-white" />
                        </button>

                        {/* Go to pages (if any) */}
                        {pages.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setStep('pages')}
                            className="w-12 h-12 rounded-full bg-emerald-700/80 backdrop-blur-sm border border-emerald-500/60 text-white flex items-center justify-center transition hover:bg-emerald-600/80 relative"
                            aria-label={`Selesai — ${pages.length} halaman`}
                            title={`Selesai (${pages.length})`}
                          >
                            <i className="bi bi-check2-circle text-xl" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                              {pages.length}
                            </span>
                          </button>
                        ) : (
                          <div className="w-12 h-12" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── First-time capture tip overlay ─────────────────────── */}
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

            {/* Camera controls panel — desktop only (lg+) */}
            <div className="hidden lg:flex flex-none bg-slate-900 border-l border-slate-800 p-6 flex-col gap-4 w-64">
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

              {/* OpenCV loading status — desktop side panel */}
              {cvLoading && (
                <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 shrink-0" />
                  <p className="text-xs text-slate-400">Memuat mesin OpenCV...</p>
                </div>
              )}
              {!cvLoading && !cvError && cv && (
                <div className="flex items-center gap-2 bg-emerald-950/50 rounded-xl p-3 border border-emerald-900/50">
                  <i className="bi bi-check-circle-fill text-emerald-400 text-sm shrink-0" />
                  <p className="text-xs text-emerald-300 font-medium">Mesin pemrosesan siap</p>
                </div>
              )}

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
                  disabled={captureBlocked}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg transition min-h-[52px] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                  title={cvLoading ? 'Memuat mesin pemrosesan...' : 'Ambil Foto'}
                >
                  {cvLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memuat...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-camera-fill text-lg" />
                      Ambil Foto
                    </>
                  )}
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
                    : 'Mode Warna: normalisasi pencahayaan CLAHE, mempertahankan warna asli dokumen.'}
                </p>
              </div>

              {/* Rotation controls */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Putar Gambar</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRotationSteps((s) => (s + 3) % 4)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                    title="Putar 90° berlawanan arum jam"
                    aria-label="Putar 90° berlawanan arum jam"
                  >
                    <i className="bi bi-arrow-counterclockwise text-base" />
                    90° CCW
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotationSteps((s) => (s + 1) % 4)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                    title="Putar 90° searah jarum jam"
                    aria-label="Putar 90° searah jarum jam"
                  >
                    <i className="bi bi-arrow-clockwise text-base" />
                    90° CW
                  </button>
                </div>
                {rotationSteps !== 0 && (
                  <p className="text-[10px] text-purple-400 font-semibold">
                    Rotasi aktif: {rotationSteps * 90}° searah jarum jam
                  </p>
                )}
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
                      Proses &amp; Tinjau
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { capturedCanvasRef.current = null; setCorners(null); setRotationSteps(0); setStep('camera'); }}
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
                    onClick={() => setPreviewLightboxOpen(true)}
                    className="max-h-[70vh] w-auto rounded-lg shadow-2xl border border-slate-700 cursor-zoom-in active:opacity-90 transition-opacity"
                    style={{ display: 'block' }}
                    title="Ketuk untuk memperbesar"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewLightboxOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                    aria-label="Perbesar preview"
                  >
                    <i className="bi bi-zoom-in text-sm" />
                    Ketuk gambar untuk memperbesar dan periksa detail teks
                  </button>
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

              {/* Fine-tune rotation */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Koreksi Orientasi</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotatePreview(3)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                    title="Putar 90° berlawanan arum jam"
                    aria-label="Putar 90° berlawanan arum jam"
                  >
                    <i className="bi bi-arrow-counterclockwise text-base" />
                    CCW
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotatePreview(1)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                    title="Putar 90° searah jarum jam"
                    aria-label="Putar 90° searah jarum jam"
                  >
                    <i className="bi bi-arrow-clockwise text-base" />
                    CW
                  </button>
                </div>
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
                  onClick={() => { capturedCanvasRef.current = null; setCorners(null); setPreviewCanvas(null); setPreviewDataUrl(null); setRotationSteps(0); setStep('camera'); }}
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

      {/* ── Preview lightbox — full-screen overlay ── */}
      {previewLightboxOpen && previewDataUrl && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95"
          onClick={() => setPreviewLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Preview diperbesar"
        >
          <button
            type="button"
            onClick={() => setPreviewLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition"
            aria-label="Tutup preview diperbesar"
            title="Tutup"
          >
            <i className="bi bi-x-lg" />
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40 pointer-events-none select-none">
            Ketuk di luar gambar untuk menutup
          </p>

          <div
            className="w-full h-full overflow-auto flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewDataUrl}
              alt="Hasil scan — diperbesar"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                touchAction: 'pinch-zoom',
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
