/**
 * compressController.ts
 *
 * POST /api/compress-pdf
 *
 * Standalone PDF compression utility — uses compressPdfIfNeeded() from
 * pdfCompressionService.ts directly.  The mail-form upload flow does NOT
 * call this controller or the compression service; files uploaded via the
 * mail forms go straight to Google Drive with no compression step.
 * No DB record or Drive file is created here; the compressed PDF is
 * streamed directly back to the caller as a file download.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { compressPdfIfNeeded, PDF_COMPRESS_TRIGGER_BYTES, PDF_COMPRESS_MAX_BYTES } from '../services/pdfCompressionService';
import path from 'path';

export const compressPdf = async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please attach a PDF.' });
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF files can be compressed by this endpoint.' });
  }

  const originalName = req.file.originalname || 'document.pdf';
  const baseName = path.basename(originalName, path.extname(originalName));
  const outputName = `${baseName}_compressed.pdf`;

  try {
    // For standalone compression tool, force compress regardless of trigger threshold
    const result = await compressPdfIfNeeded(req.file.buffer, 'application/pdf', originalName, { forceCompress: true });

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${outputName}"; filename*=UTF-8''${encodeURIComponent(outputName)}`,
      'X-Original-Size': String(result.originalSize),
      'X-Compressed-Size': String(result.finalSize),
      'X-Was-Compressed': String(result.compressed),
      // Expose custom headers to browser JS
      'Access-Control-Expose-Headers':
        'Content-Disposition, X-Original-Size, X-Compressed-Size, X-Was-Compressed',
    };

    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.send(result.buffer);
  } catch (err: any) {
    console.error('[CompressPDF] Compression failed:', err);
    res.status(422).json({
      error: 'PDF compression failed',
      message: err?.message || String(err),
    });
  }
};

/**
 * GET /api/compress-pdf/info
 * Returns the current threshold constants so the frontend badge
 * always stays in sync with the backend without hardcoding values.
 */
export const compressPdfInfo = (_req: AuthRequest, res: Response) => {
  res.json({
    trigger_bytes: PDF_COMPRESS_TRIGGER_BYTES,
    trigger_label: formatBytes(PDF_COMPRESS_TRIGGER_BYTES),
    max_label:     'Tidak ada batas',
  });
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
