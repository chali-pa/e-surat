/**
 * 50 MB threshold: files above this threshold automatically use direct Google Drive resumable upload.
 * Files up to 50 MB can use either direct resumable upload or standard upload.
 */
export const LARGE_FILE_THRESHOLD_MB = 50;

/**
 * Upper safety limit for mail documents and photos (Google Drive API supports up to 5 TB).
 * Set to 5 GB (5120 MB) so that large files (>= 50 MB) are successfully supported.
 */
export const MAX_MAIL_UPLOAD_SIZE_MB = 5120;