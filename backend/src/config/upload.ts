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
 *
 * MAX_FOLDER_UPDATE_FILE_SIZE_BYTES is a separate, independent limit that
 * applies specifically to file replacements on mail records that have a
 * folder assigned (edit/update flow only, not create).  It is enforced
 * both client-side (MailForm.jsx) and server-side (suratController.update /
 * suratKeluarController.update).
 *
 * Scope decisions (documented here so they can be changed in one place):
 *   • Per-file, not cumulative folder size — checked against the individual
 *     replacement file, not the sum of all files already in the folder.
 *   • Update-only — applied when editing an existing record that has a
 *     folder_id.  Create operations are NOT covered; to extend to creates,
 *     add the same check to the store() handlers in each controller.
 *   • Pre-compression — the limit is checked against the original uploaded
 *     file size BEFORE auto-compression runs.  If you want to attempt
 *     compression first and then check, move the guard below the
 *     compressPdfIfNeeded() call in uploadUserLetterFile().
 */

import multer from 'multer';

/**
 * Exported so other modules can reference the effective limit without
 * duplicating knowledge.  Kept as a named export for backward compat —
 * now set to Infinity to signal "no application-level cap".
 * @deprecated Use the platform's own limits rather than this constant.
 */
export const MULTER_FILE_SIZE_LIMIT_BYTES = Infinity;

export const MAX_FOLDER_UPDATE_SIZE_MB = 50;

/**
 * Maximum file size for replacement files uploaded during a folder-assigned
 * mail-record update (edit flow).
 *
 * This is the SINGLE source of truth for this limit.  Both the client
 * (MailForm.jsx) and the server (suratController / suratKeluarController)
 * import/mirror this value — do not hardcode 50 MB anywhere else.
 *
 * See the module-level doc comment for scope decisions (per-file, update-
 * only, pre-compression check).
 */
export const MAX_FOLDER_UPDATE_FILE_SIZE_BYTES = MAX_FOLDER_UPDATE_SIZE_MB * 1024 * 1024;

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
