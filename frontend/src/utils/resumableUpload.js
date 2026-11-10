import api from '../api/axios';
import { MAX_MAIL_UPLOAD_SIZE_MB } from '../config/constants';

/**
 * Uploads a letter document directly to Google Drive via server-authorized resumable upload session.
 * Handles files up to 50 MB (including the 9.15 MB reproduction case) directly from the browser
 * to Google Drive, completely bypassing serverless / proxy request-body size limits (e.g. Vercel 4.5 MB, Nginx 1MB).
 *
 * @param {Object} options
 * @param {File} options.file - The File object to upload
 * @param {'incoming' | 'outgoing'} [options.letterType='incoming'] - Type of mail
 * @param {string} [options.letterDate] - Date string (tanggal_masuk or tanggal_keluar)
 * @param {string|number} [options.folderId] - Selected folder ID
 * @param {string} [options.nomorSurat] - Letter number
 * @param {string} [options.namaSurat] - Letter subject/title
 * @param {string} [options.existingDriveFileId] - Existing Google Drive file ID to update in-place
 * @param {function} [options.onProgress] - Progress callback (percentage 0 - 100)
 * @returns {Promise<{
 *   uploaded_drive_file_id: string,
 *   original_file_name: string,
 *   file_mime_type: string,
 *   logical_path: string,
 *   parent_folder_id: string,
 *   storage_destination: string
 * }>}
 */
export async function uploadLetterFileResumable({
  file,
  letterType = 'incoming',
  letterDate,
  folderId,
  nomorSurat,
  namaSurat,
  existingDriveFileId,
  onProgress,
}) {
  if (!file) {
    throw new Error('Tidak ada file yang dipilih untuk diunggah.');
  }

  const maxBytes = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    const fileMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Ukuran file maksimum adalah ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File Anda ${fileMB} MB — silakan kurangi ukurannya dan coba lagi.`);
  }

  // 1. Request an authorized resumable session from backend
  const endpoint = letterType === 'incoming' ? '/api/surat/upload-session' : '/api/surat-keluar/upload-session';
  const sessionRes = await api.post(endpoint, {
    original_file_name: file.name,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
    tanggal_masuk: letterDate,
    tanggal_keluar: letterDate,
    folder_id: folderId || undefined,
    nomor_surat: nomorSurat || undefined,
    nama_surat: namaSurat || undefined,
    existing_drive_file_id: existingDriveFileId || undefined,
  });

  if (!sessionRes.data?.sessionUri) {
    throw new Error(sessionRes.data?.message || 'Gagal membuat sesi upload Google Drive dari server.');
  }

  const { sessionUri, cleanFileName, logicalPath, parentFolderId, storageDestination } = sessionRes.data;

  // 2. Upload raw binary stream directly to Google Drive sessionUri via XMLHttpRequest
  // to avoid sending large files through application proxies/serverless limits.
  const driveResult = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUri, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      // Google Drive returns 200 or 201 on completion
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(resp);
        } catch (e) {
          reject(new Error('Respon upload Google Drive tidak dapat dibaca.'));
        }
      } else {
        let errMessage = `Upload Google Drive gagal (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed.error?.message) errMessage += `: ${parsed.error.message}`;
        } catch (_) {
          if (xhr.statusText) errMessage += `: ${xhr.statusText}`;
        }
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Koneksi jaringan terputus saat mengunggah file ke Google Drive.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Waktu unggah ke Google Drive habis (timeout). Silakan periksa koneksi internet Anda.'));
    };

    xhr.timeout = 300000; // 5 minutes timeout for up to 50 MB uploads
    xhr.send(file);
  });

  if (!driveResult?.id) {
    throw new Error('Upload Google Drive selesai tetapi ID file tidak ditemukan.');
  }

  return {
    uploaded_drive_file_id: driveResult.id,
    original_file_name: file.name,
    file_mime_type: file.type || 'application/octet-stream',
    logical_path: logicalPath,
    parent_folder_id: parentFolderId,
    storage_destination: storageDestination,
  };
}
