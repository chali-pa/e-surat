import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import FolderSelector from '../../components/drive/FolderSelector'

const MAX_FILE_SIZE = 800 * 1024 * 1024 // 800 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
const ALLOWED_EXT = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'JPG', 'PNG']

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function SuratKeluarCreate() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    nomor_surat: '',
    nama_penerima: '',
    tanggal_keluar: '',
    tanggal_buat: '',
    nama_surat: '',
    file_surat: null,
  })
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(true)

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const res = await api.get('/api/google/status')
        if (res.data.success) {
          setGoogleConnected(!!res.data.connected)
        }
      } catch (err) {
        console.warn('Failed to check Google status:', err)
      }
    }
    checkGoogleStatus()
  }, [])

  const validateFile = (file) => {
    if (!file) return null
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipe file tidak didukung. Gunakan: ${ALLOWED_EXT.join(', ')}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Ukuran file melebihi batas maksimal 800 MB. Ukuran file Anda: ${formatBytes(file.size)}`
    }
    return null
  }

  const handleFileSelect = (file) => {
    if (!file) return
    const err = validateFile(file)
    if (err) {
      setErrors((prev) => ({ ...prev, file_surat: err }))
      setFormData((prev) => ({ ...prev, file_surat: null }))
    } else {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.file_surat
        return next
      })
      setFormData((prev) => ({ ...prev, file_surat: file }))
    }
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    handleFileSelect(file)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validasi
    const newErrors = {}
    if (!formData.nomor_surat.trim()) newErrors.nomor_surat = 'Nomor surat wajib diisi'
    if (!formData.nama_penerima.trim()) newErrors.nama_penerima = 'Nama penerima wajib diisi'
    if (!formData.tanggal_keluar) newErrors.tanggal_keluar = 'Tanggal keluar wajib diisi'
    if (!formData.tanggal_buat) newErrors.tanggal_buat = 'Tanggal buat wajib diisi'
    if (!formData.nama_surat.trim()) newErrors.nama_surat = 'Perihal surat wajib diisi'
    if (!formData.file_surat) newErrors.file_surat = 'File surat wajib diunggah'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setUploadProgress(0)
    const data = new FormData()
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) data.append(key, formData[key])
    })
    
    // Add folder_id if a folder is selected
    if (selectedFolder) {
      data.append('folder_id', selectedFolder.id)
    }

    try {
      const response = await api.post('/api/surat-keluar', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(pct)
        },
      })
      if (response.data.success) navigate('/surat-keluar')
    } catch (error) {
      const isReconnectRequired = error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED'
      if (isReconnectRequired) {
        setErrors({
          googleReconnect: true,
          general: 'Your Google connection needs to be renewed. Please reconnect your Google account to continue.',
        })
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else {
        setErrors({
          general: error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan surat keluar. Silakan coba lagi.',
        })
      }
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleReconnectGoogle = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    window.location.href = `${apiBaseUrl}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`
  }

  const inputClass = (field) =>
    `w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 bg-white focus:ring-4 ${
      errors[field]
        ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50/30'
        : 'border-slate-200 hover:border-[#DD88CF]/60 focus:border-[#4B164C] focus:ring-[#4B164C]/10'
    }`

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}>
              <i className="bi bi-send-plus" />
            </span>
            <h1 className="text-2xl font-bold text-[#4B164C]">Tambah Surat Keluar</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">Isi detail surat keluar baru dengan lengkap dan benar.</p>
        </div>
        <Link
          to="/surat-keluar"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
        >
          <i className="bi bi-arrow-left" />
          Kembali
        </Link>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, #4B164C08 0%, #DD88CF0A 100%)' }}>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <i className="bi bi-file-earmark-text text-[#4B164C]" />
            Informasi Surat Keluar
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Semua field bertanda * wajib diisi</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap"
              >
                <i className="bi bi-google" /> Hubungkan di Profil
              </Link>
            </div>
          )}

          {/* Google Reconnect Banner */}
          {errors.googleReconnect ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-start gap-3 text-amber-800 text-sm font-medium">
                <i className="bi bi-[#4B164C] bi-exclamation-triangle-fill text-amber-500 text-lg flex-shrink-0 mt-0.5" />
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
                  <i className="bi bi-[#4B164C] bi-google" /> Reconnect Google
                </button>
              </div>
            </div>
          ) : errors.general ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <i className="bi bi-exclamation-triangle-fill text-red-400 mt-0.5 flex-shrink-0" />
              <span>{errors.general}</span>
            </div>
          ) : null}

          {/* Section: Data Surat */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Data Surat</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Contoh: 001/INST/VIII/2024"
                  />
                </div>
                {errors.nomor_surat && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <i className="bi bi-exclamation-circle" /> {errors.nomor_surat}
                  </p>
                )}
              </div>

              {/* Nama Penerima */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Nama Penerima <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="bi bi-person-check" />
                  </span>
                  <input
                    type="text"
                    value={formData.nama_penerima}
                    onChange={(e) => setFormData({ ...formData, nama_penerima: e.target.value })}
                    className={inputClass('nama_penerima') + ' pl-9'}
                    placeholder="Nama instansi / perorangan penerima"
                  />
                </div>
                {errors.nama_penerima && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <i className="bi bi-exclamation-circle" /> {errors.nama_penerima}
                  </p>
                )}
              </div>

              {/* Tanggal Keluar */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Tanggal Keluar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="bi bi-calendar-event" />
                  </span>
                  <input
                    type="date"
                    value={formData.tanggal_keluar}
                    onChange={(e) => setFormData({ ...formData, tanggal_keluar: e.target.value })}
                    className={inputClass('tanggal_keluar') + ' pl-9'}
                  />
                </div>
                {errors.tanggal_keluar && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <i className="bi bi-exclamation-circle" /> {errors.tanggal_keluar}
                  </p>
                )}
              </div>

              {/* Tanggal Buat */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Tanggal Buat <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="bi bi-calendar-plus" />
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
            letterDate={formData.tanggal_keluar || formData.tanggal_buat}
            selectedFolder={selectedFolder}
            onFolderChange={setSelectedFolder}
            letterType="outgoing"
            disabled={loading}
          />

          {/* Upload File */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Upload File Surat <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                Maks. 800 MB
              </span>
            </div>

            {/* Drag & Drop Zone */}
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
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />

              {formData.file_surat ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
                    <i className="bi bi-file-earmark-check-fill" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{formData.file_surat.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatBytes(formData.file_surat.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFormData((prev) => ({ ...prev, file_surat: null }))
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 mt-1"
                  >
                    <i className="bi bi-x-circle" /> Hapus file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                    dragActive ? 'bg-[#4B164C]/10 text-[#4B164C] scale-110' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <i className={`bi ${dragActive ? 'bi-cloud-arrow-down-fill' : 'bi-cloud-arrow-up'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">
                      {dragActive ? 'Lepaskan file di sini' : 'Drag & drop file atau '}
                      {!dragActive && (
                        <span className="text-[#4B164C] underline underline-offset-2">pilih file</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {ALLOWED_EXT.join(', ')} — Maksimal 800 MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {errors.file_surat && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="bi bi-exclamation-circle" /> {errors.file_surat}
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <i className="bi bi-cloud-arrow-up-fill text-[#4B164C]" />
                  Mengunggah file...
                </span>
                <span className="text-[#4B164C] font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #4B164C 0%, #DD88CF 100%)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-xs text-slate-400">
              <i className="bi bi-info-circle mr-1" />
              Pastikan semua data sudah benar sebelum menyimpan
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/surat-keluar"
                className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-gray-50 hover:border-slate-300 transition-all duration-200"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={loading}
                id="btn-simpan-surat-keluar"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {uploadProgress > 0 ? `Mengunggah ${uploadProgress}%` : 'Menyimpan...'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-floppy" /> Simpan Surat Keluar
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
