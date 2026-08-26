/**
 * Multer upload configuration (memory storage).
 *
 * MULTER_FILE_SIZE_LIMIT_BYTES is the single place to change the accepted
 * upload ceiling.  It is exported so other modules (e.g. pdfCompressionService)
 * can reference it without hard-coding the value again.
 *
 * NOTE: The spec documents 800 MB as the maximum file size.  In practice,
 * scanned letters are typically 100 KB – 10 MB.  pdfCompressionService
 * uses PDF_COMPRESS_TRIGGER_BYTES (default 8 MB) to decide whether to
 * compress before forwarding to Google Drive.
 */

import multer from 'multer';

/** Maximum size of a single uploaded file (bytes). */
export const MULTER_FILE_SIZE_LIMIT_BYTES = 800 * 1024 * 1024; // 800 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MULTER_FILE_SIZE_LIMIT_BYTES,
  },
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
