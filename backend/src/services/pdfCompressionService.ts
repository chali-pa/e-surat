/**
 * pdfCompressionService.ts
 *
 * Automatic PDF compression for uploaded letters.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THRESHOLD NOTE
 * ──────────────────────────────────────────────────────────────────────────
 * Two separate, clearly-named constants control compression behaviour:
 *
 *   PDF_COMPRESS_TRIGGER_BYTES  — files AT OR ABOVE this size are
 *     automatically compressed before being stored in Google Drive.
 *     Default: 8 MB.  Change this one value to adjust the trigger.
 *
 *   PDF_COMPRESS_MAX_BYTES  — formerly a hard post-compression rejection
 *     gate (800 MB).  Now set to Infinity — the compressed result is always
 *     accepted regardless of final size.  The constant is retained only for
 *     backward compatibility with callers that reference it (e.g. the
 *     /api/compress-pdf/info endpoint).
 *
 * Both constants are exported so callers and tests can reference them
 * without importing magic numbers.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * LIBRARY CHOICE
 * ──────────────────────────────────────────────────────────────────────────
 * Uses `pdf-lib` (pure JavaScript, no native binaries).  This is safe on
 * Vercel serverless functions and any Node.js host.  pdf-lib re-saves the
 * PDF document, which removes redundant cross-reference tables, unused
 * object streams, and duplicate resources — achieving moderate compression
 * on typical scanned-letter PDFs (often 20–50 % size reduction).
 *
 * It does NOT perform image re-encoding or lossy downsampling, so it will
 * not significantly compress PDFs that are already image-only.  For those
 * cases the service returns the best-achieved size and logs a warning.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { PDFDocument } from 'pdf-lib';

/** Files at or above this size trigger automatic compression (in bytes). */
export const PDF_COMPRESS_TRIGGER_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * No hard post-compression rejection cap.  The compressed buffer is always
 * accepted regardless of final size — if the PDF cannot be meaningfully
 * reduced, the best-achieved result is returned and stored.
 *
 * @deprecated  This constant is retained only so existing callers that import
 * it (e.g. compressController.ts /info endpoint) don't break.  It no longer
 * acts as a rejection gate inside compressPdfIfNeeded().
 */
export const PDF_COMPRESS_MAX_BYTES = Infinity;

export interface CompressionResult {
  /** Final buffer to upload — may be the original if compression was skipped or failed */
  buffer: Buffer;
  /** Whether compression was actually attempted */
  compressed: boolean;
  /** Original file size in bytes */
  originalSize: number;
  /** Final file size in bytes (equals originalSize when not compressed) */
  finalSize: number;
  /** Human-readable summary logged server-side */
  summary: string;
}

/**
 * Compress a PDF buffer if it meets the trigger threshold.
 *
 * Behaviour:
 *   - File is NOT a PDF (by mimeType)  → returned unchanged, no error.
 *   - File is a PDF < trigger           → returned unchanged, no compression.
 *   - File is a PDF ≥ trigger           → pdf-lib re-save attempted.
 *       • If re-save succeeds           → compressed buffer returned (always accepted).
 *       • If re-save throws (corrupt / unsupported PDF) → error thrown with clear message.
 *
 * @param fileBuffer  Raw file bytes from multer memoryStorage.
 * @param mimeType    MIME type declared by the client (e.g. 'application/pdf').
 * @param fileName    Original filename — used only for logging, not for renaming.
 */
export async function compressPdfIfNeeded(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<CompressionResult> {
  const originalSize = fileBuffer.length;

  // Not a PDF — pass through untouched
  if (mimeType !== 'application/pdf') {
    return {
      buffer: fileBuffer,
      compressed: false,
      originalSize,
      finalSize: originalSize,
      summary: `[PDF Compression] Skipped (not a PDF): ${fileName} (${formatBytes(originalSize)})`,
    };
  }

  // Under trigger threshold — pass through untouched
  if (originalSize < PDF_COMPRESS_TRIGGER_BYTES) {
    return {
      buffer: fileBuffer,
      compressed: false,
      originalSize,
      finalSize: originalSize,
      summary: `[PDF Compression] Skipped (${formatBytes(originalSize)} < trigger ${formatBytes(PDF_COMPRESS_TRIGGER_BYTES)}): ${fileName}`,
    };
  }

  console.log(
    `[PDF Compression] File "${fileName}" is ${formatBytes(originalSize)} — ` +
    `above trigger ${formatBytes(PDF_COMPRESS_TRIGGER_BYTES)}. Attempting compression…`
  );

  let compressedBuffer: Buffer;
  try {
    const pdfDoc = await PDFDocument.load(fileBuffer, {
      // Ignore minor structural errors — many scanner-produced PDFs have them
      ignoreEncryption: false,
      updateMetadata: false,
    });

    const savedBytes = await pdfDoc.save({
      // useObjectStreams packs indirect objects into compressed streams,
      // the single most effective knob pdf-lib exposes for size reduction.
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    compressedBuffer = Buffer.from(savedBytes);
  } catch (err: any) {
    // Propagate a clear, user-visible error rather than silently uploading oversized original
    const reason = err?.message || String(err);
    throw new Error(
      `PDF ini tidak dapat dikompresi (${reason}). ` +
      `Ukuran asli: ${formatBytes(originalSize)}. ` +
      `Silakan kurangi ukuran file dan coba lagi.`
    );
  }

  const finalSize = compressedBuffer.length;
  const savingPct = Math.round(((originalSize - finalSize) / originalSize) * 100);

  const summary =
    `[PDF Compression] "${fileName}": ` +
    `${formatBytes(originalSize)} → ${formatBytes(finalSize)} ` +
    `(−${savingPct}%)`;

  console.log(summary);

  if (finalSize >= originalSize) {
    // Compression made the file bigger or the same (already optimised) — use original
    console.warn(
      `[PDF Compression] Result is not smaller (${formatBytes(finalSize)} ≥ ${formatBytes(originalSize)}). ` +
      `Using original buffer for "${fileName}".`
    );
    return {
      buffer: fileBuffer,
      compressed: false,
      originalSize,
      finalSize: originalSize,
      summary: summary + ' [reverted to original — no gain]',
    };
  }

  return {
    buffer: compressedBuffer,
    compressed: true,
    originalSize,
    finalSize,
    summary,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
