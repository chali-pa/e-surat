/**
 * Frontend constants — mirrors critical backend configuration values.
 * 
 * These values MUST stay in sync with their backend counterparts:
 *   - MAX_MAIL_UPLOAD_SIZE_MB matches backend/src/config/upload.ts
 * 
 * When backend constants change, update these as well.
 */

/**
 * Maximum file size for mail form uploads (incoming and outgoing).
 * Files exceeding this limit are rejected with a clear error message.
 * No auto-compression occurs — users must compress large files manually
 * using the standalone PDF Compressor tool before uploading.
 * 
 * This replaces the previous auto-compression approach for mail uploads.
 */
export const MAX_MAIL_UPLOAD_SIZE_MB = 50;
export const MAX_MAIL_UPLOAD_SIZE_BYTES = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * @deprecated Legacy constant kept for compatibility with existing code.
 * Use MAX_MAIL_UPLOAD_SIZE_MB for new implementations.
 */
export const MAX_FOLDER_UPDATE_SIZE_MB = 50;