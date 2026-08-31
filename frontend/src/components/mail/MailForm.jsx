import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../api/axios';
import FolderSelector from '../drive/FolderSelector';
import { MAX_MAIL_UPLOAD_SIZE_MB } from '../../config/constants';

/**
 * Supported file types for mail form uploads.
 * Files exceeding MAX_MAIL_UPLOAD_SIZE_MB are rejected — no compression occurs.
 */
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];
const ALLOWED_EXT = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'JPG', 'PNG'];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function MailForm({ type, id, prepopulatedFile, onClearFile, onSaved, onCancel }) {
  const isEditMode = !!id;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nomor_surat: '',
    nama_pengirim: '', // for incoming
    nama_penerima: '', // for outgoing
    tanggal_masuk: '', // for incoming
    tanggal_keluar: '', // for outgoing
    tanggal_buat: '',
    nama_surat: '',
    file_surat: null,
  });

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(true);
  
  const [objectUrl, setObjectUrl] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (formData.file_surat) {
      const url = URL.createObjectURL(formData.file_surat);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setObjectUrl('');
    }
  }, [formData.file_surat]);

  // Check Google account connection status
  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const res = await api.get('/api/google/status');
        if (res.data.success) {
          setGoogleConnected(!!res.data.connected);
        }
      } catch (err) {
        console.warn('Failed to check Google status:', err);
      }
    };
    checkGoogleStatus();
  }, []);

  // Fetch existing letter data if in Edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchLetter = async () => {
        setFetchingData(true);
        try {
          const endpoint = type === 'incoming' ? `/api/surat/${id}` : `/api/surat-keluar/${id}`;
          const response = await api.get(endpoint);
          const surat = response.data.data;
          
          setFormData({
            nomor_surat: surat.nomor_surat || '',
            nama_pengirim: surat.nama_pengirim || '',
            nama_penerima: surat.nama_penerima || '',
            tanggal_masuk: surat.tanggal_masuk?.split('T')[0] || '',
            tanggal_keluar: surat.tanggal_keluar?.split('T')[0] || '',
            tanggal_buat: surat.tanggal_buat?.split('T')[0] || '',
            nama_surat: surat.nama_surat || '',
            file_surat: null,
          });

          if (surat.folder_id) {
            setSelectedFolder({ id: surat.folder_id });
          }
        } catch (error) {
          console.error(`Failed to fetch ${type} letter:`, error);
          setErrors({ general: `Gagal memuat data surat ${type === 'incoming' ? 'masuk' : 'keluar'}.` });
        } finally {
          setFetchingData(false);
        }
      };
      fetchLetter();
    }
  }, [id, type, isEditMode]);

  const validateFile = (file) => {
    if (!file) return null;
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipe file tidak didukung. Gunakan: ${ALLOWED_EXT.join(', ')}`;
    }
    return null;
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // ── Mail upload size limit (client-side) ────────────────────────────
    // Applies universally: all file types, create and update, folder or not.
    // Mirrors the server-side check in suratController / suratKeluarController.
    const limitBytes = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;
    if (file.size > limitBytes) {
      const fileMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrors((prev) => ({
        ...prev,
        file_surat: `Ukuran file maksimum adalah ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File Anda ${fileMB} MB — silakan kurangi ukurannya dan coba lagi.`,
      }));
      setFormData((prev) => ({ ...prev, file_surat: null }));
      return;
    }

    const err = validateFile(file);
    if (err) {
      setErrors((prev) => ({ ...prev, file_surat: err }));
      setFormData((prev) => ({ ...prev, file_surat: null }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.file_surat;
        return next;
      });
      setFormData((prev) => ({ ...prev, file_surat: file }));
    }
  };

  // Prepopulate scanned file if provided
  useEffect(() => {
    if (prepopulatedFile) {
      handleFileSelect(prepopulatedFile);
    }
  }, [prepopulatedFile]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validations
    const newErrors = {};
    if (!formData.nomor_surat.trim()) newErrors.nomor_surat = 'Nomor surat wajib diisi';
    if (type === 'incoming') {
      if (!formData.nama_pengirim.trim()) newErrors.nama_pengirim = 'Nama pengirim wajib diisi';
      if (!formData.tanggal_masuk) newErrors.tanggal_masuk = 'Tanggal masuk wajib diisi';
    } else {
      if (!formData.nama_penerima.trim()) newErrors.nama_penerima = 'Nama penerima wajib diisi';
      if (!formData.tanggal_keluar) newErrors.tanggal_keluar = 'Tanggal keluar wajib diisi';
    }
    if (!formData.tanggal_buat) newErrors.tanggal_buat = 'Tanggal buat wajib diisi';
    if (!formData.nama_surat.trim()) newErrors.nama_surat = 'Perihal surat wajib diisi';
    if (!isEditMode && !formData.file_surat) newErrors.file_surat = 'File surat wajib diunggah';

    // ── Mail upload size limit (submit-time guard) ────────────────────────
    // Safety net in case the file was set before the size check could run
    // (e.g. file dragged in before validateFile ran with current state).
    if (formData.file_surat) {
      const limitBytes = MAX_MAIL_UPLOAD_SIZE_MB * 1024 * 1024;
      if (formData.file_surat.size > limitBytes) {
        const fileMB = (formData.file_surat.size / (1024 * 1024)).toFixed(1);
        newErrors.file_surat = `Ukuran file maksimum adalah ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File Anda ${fileMB} MB — silakan kurangi ukurannya dan coba lagi.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) {
        data.append(key, formData[key]);
      }
    });

    if (selectedFolder) {
      data.append('folder_id', selectedFolder.id);
    }

    try {
      let response;
      if (isEditMode) {
        const endpoint = type === 'incoming' ? `/api/surat/${id}` : `/api/surat-keluar/${id}`;
        response = await api.post(endpoint, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          },
        });
      } else {
        const endpoint = type === 'incoming' ? '/api/surat' : '/api/surat-keluar';
        response = await api.post(endpoint, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          },
        });
      }

      if (response.data.success) {
        onSaved(type, isEditMode ? 'updated' : 'created');
      }
    } catch (error) {
      console.error(`Error saving ${type} mail:`, error);
      const isReconnectRequired = error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED';
      if (isReconnectRequired) {
        setErrors({
          googleReconnect: true,
          general: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        });
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({
          general: error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan surat. Silakan coba lagi.',
        });
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleReconnectGoogle = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    window.location.href = `${apiBaseUrl}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`;
  };

  const inputClass = (field) => {
    return `w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 bg-white ${
      errors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
        : 'border-slate-200 hover:border-[#DD88CF]/60 focus:border-[#4B164C] focus:ring-[#4B164C]/10'
    }`;
  };

  const renderFormBody = (isSplit) => {
    const fieldsGridClass = isSplit ? "grid grid-cols-1 gap-5" : "grid grid-cols-1 md:grid-cols-2 gap-6";
    return (
      <>
        {/* Grid Fields */}
        <div className={fieldsGridClass}>
          {/* Nomor Surat */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Nomor Surat <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="bi bi-hash" />
              </span>
              <input
                type="text"
                value={formData.nomor_surat}
                onChange={(e) => setFormData({ ...formData, nomor_surat: e.target.value })}
                className={inputClass('nomor_surat') + ' pl-9'}
                placeholder="Contoh: 123/Ltr/VIII/2026"
              />
            </div>
            {errors.nomor_surat && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="bi bi-exclamation-circle" /> {errors.nomor_surat}
              </p>
            )}
          </div>

          {/* Pengirim / Penerima */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              {type === 'incoming' ? 'Nama Pengirim' : 'Nama Penerima'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="bi bi-person" />
              </span>
              <input
                type="text"
                value={type === 'incoming' ? formData.nama_pengirim : formData.nama_penerima}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [type === 'incoming' ? 'nama_pengirim' : 'nama_penerima']: e.target.value,
                  })
                }
                className={inputClass(type === 'incoming' ? 'nama_pengirim' : 'nama_penerima') + ' pl-9'}
                placeholder={type === 'incoming' ? 'Nama instansi atau perorangan pengirim' : 'Nama instansi atau perorangan penerima'}
              />
            </div>
            {errors[type === 'incoming' ? 'nama_pengirim' : 'nama_penerima'] && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="bi bi-exclamation-circle" /> {errors[type === 'incoming' ? 'nama_pengirim' : 'nama_penerima']}
              </p>
            )}
          </div>

          {/* Tgl Masuk / Tgl Keluar */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              {type === 'incoming' ? 'Tanggal Masuk' : 'Tanggal Keluar'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="bi bi-calendar-event" />
              </span>
              <input
                type="date"
                value={type === 'incoming' ? formData.tanggal_masuk : formData.tanggal_keluar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [type === 'incoming' ? 'tanggal_masuk' : 'tanggal_keluar']: e.target.value,
                  })
                }
                className={inputClass(type === 'incoming' ? 'tanggal_masuk' : 'tanggal_keluar') + ' pl-9'}
              />
            </div>
            {errors[type === 'incoming' ? 'tanggal_masuk' : 'tanggal_keluar'] && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="bi bi-exclamation-circle" /> {errors[type === 'incoming' ? 'tanggal_masuk' : 'tanggal_keluar']}
              </p>
            )}
          </div>

          {/* Tanggal Buat */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Tanggal Buat Surat <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="bi bi-calendar" />
              </span>
              <input
                type="date"
                value={formData.tanggal_buat}
                onChange={(e) => setFormData({ ...formData, tanggal_buat: e.target.value })}
                className={inputClass('tanggal_buat') + ' pl-9'}
              />
            </div>
            {errors.tanggal_buat && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="bi bi-exclamation-circle" /> {errors.tanggal_buat}
              </p>
            )}
          </div>
        </div>

        {/* Perihal */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Perihal / Nama Surat <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <i className="bi bi-card-text" />
            </span>
            <input
              type="text"
              value={formData.nama_surat}
              onChange={(e) => setFormData({ ...formData, nama_surat: e.target.value })}
              className={inputClass('nama_surat') + ' pl-9'}
              placeholder="Perihal atau nama surat secara lengkap"
            />
          </div>
          {errors.nama_surat && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <i className="bi bi-exclamation-circle" /> {errors.nama_surat}
            </p>
          )}
        </div>

        {/* Folder Selection */}
        <FolderSelector
          letterDate={type === 'incoming' ? (formData.tanggal_masuk || formData.tanggal_buat) : (formData.tanggal_keluar || formData.tanggal_buat)}
          selectedFolder={selectedFolder}
          onFolderChange={setSelectedFolder}
          letterType={type}
          disabled={loading}
        />

        {/* Upload File */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
            <label className="block text-sm font-semibold text-slate-700">
              Upload File Surat {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <span
              className="inline-flex items-center self-start sm:self-auto text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full font-medium"
              title={`Ukuran file maksimum ${MAX_MAIL_UPLOAD_SIZE_MB} MB. File yang melebihi batas ini akan ditolak.`}
            >
              <i className="bi bi-hdd mr-1 flex-shrink-0" />
              Maks. {MAX_MAIL_UPLOAD_SIZE_MB} MB
            </span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-200 text-center ${
              dragActive
                ? 'border-[#4B164C] bg-[#4B164C]/5 scale-[1.01]'
                : errors.file_surat
                ? 'border-red-300 bg-red-50/30 hover:border-red-400'
                : formData.file_surat
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-slate-200 bg-slate-50/50 hover:border-[#DD88CF] hover:bg-[#DD88CF]/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              className="hidden"
              accept={ALLOWED_TYPES.join(',')}
            />

            {formData.file_surat ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                  <i className="bi bi-file-earmark-check text-2xl" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 max-w-[300px] mx-auto truncate">
                    {formData.file_surat.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatBytes(formData.file_surat.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, file_surat: null });
                    if (onClearFile) onClearFile();
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition min-h-[36px]"
                >
                  Hapus File
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto text-[#4B164C] mb-2">
                  <i className="bi bi-cloud-arrow-up text-2xl" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Tarik & lepas file di sini, atau klik untuk memilih
                </p>
                <p className="text-xs text-slate-400">
                  Mendukung: PDF, Word, Excel, JPG, PNG · Maks. {MAX_MAIL_UPLOAD_SIZE_MB} MB
                </p>
              </div>
            )}
          </div>
          {errors.file_surat && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <i className="bi bi-exclamation-circle" /> {errors.file_surat}
            </p>
          )}

          {isEditMode && !formData.file_surat && (
            <p className="text-xs text-slate-400 italic">
              * Biarkan kosong jika tidak ingin mengubah file surat yang sudah diunggah.
            </p>
          )}
        </div>

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Mengunggah dokumen ke Google Drive...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#4B164C] to-[#DD88CF] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions — full-width stacked on mobile, side-by-side on sm+ */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 min-h-[44px]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:opacity-50 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            {loading && <i className="bi bi-arrow-repeat animate-spin text-sm" />}
            {isEditMode ? 'Simpan Perubahan' : 'Tambah Surat'}
          </button>
        </div>
      </>
    );
  };

  if (fetchingData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-slate-400">
        <i className="bi bi-arrow-repeat text-4xl mb-3 block animate-spin" />
        Memuat data surat...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div
        className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #4B164C08 0%, #DD88CF0A 100%)' }}
      >
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <i className={`bi ${type === 'incoming' ? 'bi-file-earmark-arrow-down' : 'bi-file-earmark-arrow-up'} text-[#4B164C] flex-shrink-0`} />
            <span className="truncate">{isEditMode ? 'Edit' : 'Tambah'} Surat {type === 'incoming' ? 'Masuk' : 'Keluar'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Semua field bertanda * wajib diisi</p>
        </div>
        {/* Close button — min 44×44 touch target */}
        <button
          type="button"
          onClick={onCancel}
          className="flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          aria-label="Tutup form"
        >
          <i className="bi bi-x-lg text-lg" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {/* Google Not Connected Banner */}
        {!googleConnected && !errors.googleReconnect && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-start gap-3 text-sm">
              <i className="bi bi-exclamation-triangle-fill text-amber-500 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Akun Google Belum Terhubung</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Hubungkan akun Google Anda dari profil agar surat tersimpan otomatis ke Google Drive dan Google Sheets pribadi Anda.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReconnectGoogle}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap"
            >
              <i className="bi bi-google" /> Hubungkan
            </button>
          </div>
        )}

        {/* Google Reconnect Banner */}
        {errors.googleReconnect ? (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-start gap-3 text-amber-800 text-sm font-medium">
              <i className="bi bi-exclamation-triangle-fill text-amber-500 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Your Google connection needs to be renewed.</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please reconnect your Google account to continue saving your letters to Google Drive and Google Sheets.
                </p>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleReconnectGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <i className="bi bi-google" /> Reconnect Google
              </button>
            </div>
          </div>
        ) : errors.general ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
            <i className="bi bi-exclamation-octagon-fill text-red-500 text-lg flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Terjadi Kesalahan</p>
              <p className="text-xs text-red-600 mt-0.5">{errors.general}</p>
            </div>
          </div>
        ) : null}

        {/* Conditional Layout */}
        {formData.file_surat && prepopulatedFile ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Large Legible Preview (Takes 7/12 width on desktop) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col h-[580px] relative shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">File Terpindai</span>
                    <h4 className="text-xs font-semibold text-slate-700 truncate">{formData.file_surat.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="px-2.5 py-1.5 bg-[#4B164C] text-white hover:bg-opacity-90 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition min-h-[32px]"
                      title="Perbesar Tampilan"
                    >
                      <i className="bi bi-zoom-in" />
                      <span>Zoom</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 bg-white rounded-xl overflow-hidden border border-slate-150 flex items-center justify-center relative">
                  {formData.file_surat.type === 'application/pdf' ? (
                    <iframe
                      src={objectUrl}
                      title="PDF Scanned Document Preview"
                      className="w-full h-full border-none"
                    />
                  ) : (
                    <img
                      src={objectUrl}
                      alt="Scanned Document Preview"
                      className="max-w-full max-h-full object-contain cursor-zoom-in"
                      onClick={() => setLightboxOpen(true)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Form fields */}
            <div className="lg:col-span-5 space-y-6">
              {renderFormBody(true)}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {renderFormBody(false)}
          </div>
        )}
      </form>

      {/* Click to Enlarge Lightbox modal */}
      {lightboxOpen && objectUrl && (
        <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-sm flex flex-col">
          <header className="p-4 flex items-center justify-between text-white border-b border-white/10 bg-slate-950">
            <h3 className="text-sm font-semibold truncate">{formData.file_surat?.name}</h3>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 text-white min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition"
            >
              <i className="bi bi-x-lg text-lg" />
            </button>
          </header>
          <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            {formData.file_surat?.type === 'application/pdf' ? (
              <iframe
                src={objectUrl}
                title="Full Screen PDF Preview"
                className="w-full h-full max-w-5xl rounded-lg bg-white shadow-2xl"
              />
            ) : (
              <img
                src={objectUrl}
                alt="Full screen view"
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
