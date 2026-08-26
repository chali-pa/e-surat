/**
 * Multer upload configuration (memory storage).
 *
 * No hard application-level file-size cap is enforced here.
 * The only size constraints are genuine infrastructure limits:
 *
 *   • Vercel Hobby:  ~4.5 MB payload limit (platform hard limit)
 *   • Vercel Pro:    up to 250 MB payload limit
 *   • Self-hosted:   limited only by available server memory and
 *                    the client_max_body_size of any upstream proxy
 *                    (e.g. Nginx default is 1 MB — raise it explicitly
 *                    if deploying behind Nginx with large uploads).
 *
 * PDF auto-compression uses PDF_COMPRESS_TRIGGER_BYTES (8 MB, defined in
 * pdfCompressionService.ts) to decide whether to compress before Drive
 * upload — that threshold is unrelated to any upload size cap.
 */

import multer from 'multer';

/**
 * Exported so other modules can reference the effective limit without
 * duplicating knowledge.  Kept as a named export for backward compat —
 * now set to Infinity to signal "no application-level cap".
 * @deprecated Use the platform's own limits rather than this constant.
 */
export const MULTER_FILE_SIZE_LIMIT_BYTES = Infinity;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  // No fileSize limit — large files are handled by the compression pipeline
  // and bounded only by genuine infrastructure constraints (see module doc).
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG are allowed.'));
    }
  },
});

export default upload;
