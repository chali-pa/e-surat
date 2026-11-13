/**
 * Multer upload configuration (memory storage).
 *
 * No hard multer-level file-size cap is enforced here — the application-level
 * check (MAX_MAIL_UPLOAD_SIZE_BYTES) is performed in each controller handler
 * AFTER multer has parsed the multipart body, so that we can return a
 * structured JSON error rather than relying on multer's generic LIMIT_FILE_SIZE
 * error which is harder to surface cleanly in the frontend.
 *
 * Infrastructure limits that are ABOVE our 50 MB application limit and will
 * therefore never interfere:
 *   • Express body-parser:  2 GB   (see backend/src/index.ts)
 *   • Multer fileSize:      Infinity (no cap — controller rejects first)
 *   • Self-hosted Nginx:    Set client_max_body_size ≥ 50m in nginx.conf
 *
 * Auto-PDF-compression no longer runs in the mail-form upload flow.
 * It is used only by the standalone PDF Compressor tool (POST /api/compress-pdf).
 * See backend/src/services/pdfCompressionService.ts for that logic.
 *
 * MAX_MAIL_UPLOAD_SIZE_BYTES is the SINGLE source of truth for the
 * mail-form upload cap.  It is enforced:
 *   • Client-side  — frontend/src/components/mail/MailForm.jsx
 *   • Server-side  — suratController.store/update + suratKeluarController.store/update
 *
 * Scope:
 *   • All supported file types (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG).
 *   • Both create (store) and update (edit) operations.
 *   • Both incoming ("surat masuk") and outgoing ("surat keluar") mail forms.
 *   • Checked against the original uploaded file size — no compression step occurs.
 */

import multer from 'multer';

/**
/**
 * Maximum file size for multipart buffer upload directly through the backend.
 * Files larger than 50 MB automatically switch to direct Google Drive resumable upload.
 */
export const MAX_MULTIPART_UPLOAD_SIZE_MB = 50;
export const MAX_MULTIPART_UPLOAD_SIZE_BYTES = MAX_MULTIPART_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * Maximum overall allowed file size for Google Drive resumable uploads (5 GB).
 * Ensures files >= 50 MB can be uploaded and updated successfully.
 */
export const MAX_MAIL_UPLOAD_SIZE_MB = 5120;
export const MAX_MAIL_UPLOAD_SIZE_BYTES = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;




const storage = multer.memoryStorage();

const upload = multer({
  storage,
  // No fileSize cap here — the controller handlers reject oversize files with a
  // structured JSON 413 response before calling uploadUserLetterFile().
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/x-pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = (file.originalname ? file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase() : '');

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP are allowed.'));
    }
  },
});

export default upload;
