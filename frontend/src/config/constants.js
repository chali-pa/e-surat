/**
 * Global frontend constants configuration.
 *
 * MAX_MAIL_UPLOAD_SIZE_MB is the SINGLE source of truth for the maximum file
 * size accepted by the incoming / outgoing mail create-or-edit forms.
 *
 * Mirrors backend/src/config/upload.ts → MAX_MAIL_UPLOAD_SIZE_MB.
 * Change it in both places if the limit ever needs to change.
 *
 * Scope: all supported file types (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG),
 * both create and update flows, both incoming and outgoing mail forms.
 * No auto-compression occurs — files over this limit are rejected outright.
 */
export const MAX_MAIL_UPLOAD_SIZE_MB = 50;