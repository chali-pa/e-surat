/**
 * Multer upload configuration (memory storage).
 *
 * NO auto-compression occurs for mail uploads as of this revision.
 * Files uploaded through incoming/outgoing mail forms are sent directly
 * to Google Drive with no compression step, subject only to the size
 * limits below and genuine infrastructure constraints.
 *
 * The standalone PDF Compressor tool (sidebar) continues to work independently
 * with its own compression logic via the /api/compress-pdf endpoint.
 *
 * Size constraints:
 *   • MAX_MAIL_UPLOAD_SIZE_MB: 50 MB limit for all mail form uploads
 *   • Infrastructure limits: Vercel (~4.5 MB Hobby, ~250 MB Pro), Nginx
 *     client_max_body_size, etc. — ensure these are set appropriately.
 *   • MAX_FOLDER_UPDATE_FILE_SIZE_BYTES: Previously implemented 50 MB limit
 *     for folder-assigned record updates (kept for backward compatibility).
 */

import multer from 'multer';

/**
 * Maximum file size for any document/photo uploaded through the mail forms
 * (both incoming and outgoing, both create and edit operations).
 * 
 * This replaces the previous auto-compression approach with a simple size limit.
 * Files exceeding this limit are rejected with a clear error message.
 * 
 * 50 MB = 50 × 1024 × 1024 = 52,428,800 bytes
 */
export const MAX_MAIL_UPLOAD_SIZE_MB = 50;
export const MAX_MAIL_UPLOAD_SIZE_BYTES = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * @deprecated Use MAX_MAIL_UPLOAD_SIZE_BYTES for general mail uploads instead.
 * This constant remains for backward compatibility with existing folder-update
 * validation code but should be consolidated.
 */
export const MAX_FOLDER_UPDATE_SIZE_MB = 50;
export const MAX_FOLDER_UPDATE_FILE_SIZE_BYTES = MAX_FOLDER_UPDATE_SIZE_MB * 1024 * 1024;

/**
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
