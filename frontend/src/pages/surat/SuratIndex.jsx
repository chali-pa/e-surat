import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import { getSuratDriveUrl } from '../../utils/getDriveFileUrl'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * Build the authenticated file URL for a given surat ID.
 */
function getFileUrl(suratId, disposition = 'inline') {
  const token = localStorage.getItem('token')
  const base = `${API_BASE_URL}/api/surat/${suratId}/file`
  if (disposition === 'attachment') {
    return `${base}?disposition=attachment&token=${encodeURIComponent(token || '')}`
  }
  return `${base}?token=${encodeURIComponent(token || '')}`
}

export default function SuratIndex() {
  const [surats, setSurats] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })
  const [previewModal, setPreviewModal] = useState({ show: false, surat: null, autoPrint: false })
  const [reconnectNeeded, setReconnectNeeded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })

  useEffect(() => {
    fetchSurats()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClosePreview()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, type: 'success', message: '' })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

  const fetchSurats = async () => {
    try {
      const response = await api.get('/api/surat')
      setSurats(response.data.data || [])
    } catch (error) {
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true)
      }
      console.error('Failed to fetch surats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReconnectGoogle = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    window.location.href = `${API_BASE_URL}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/api/surat/${id}`)
      if (response.data.success) {
        setSurats(prev => prev.filter(s => s.id !== id))
        setToast({
          show: true,
          type: 'success',
          message: response.data.message || 'File deleted successfully from the application and Google Drive.'
        })
      }
    } catch (error) {
      console.error('Failed to delete surat:', error)
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true)
      } else {
        const errorMsg = error.response?.data?.error || 'The record could not be fully deleted because the Google Drive file could not be removed.'
        setToast({
          show: true,
          type: 'error',
          message: errorMsg
        })
      }
    } finally {
      setDeleteModal({ show: false, id: null, name: '' })
    }
  }

  const handlePreview = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) {
      alert('File tidak tersedia untuk preview')
      return
    }
    window.dispatchEvent(new CustomEvent('collapseSidebar'))
    setPreviewModal({ show: true, surat, autoPrint: false })
  }

  const handleClosePreview = () => {
    setPreviewModal({ show: false, surat: null, autoPrint: false })
    window.dispatchEvent(new CustomEvent('expandSidebar'))
  }

  const handleView = (surat) => {
    if (surat.google_drive_id) {
      const url = getFileUrl(surat.id, 'inline')
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    const driveUrl = getSuratDriveUrl(surat)
    if (driveUrl) {
      window.open(driveUrl, '_blank', 'noopener,noreferrer')
      return
    }

    alert('File tidak tersedia atau belum diunggah ke Google Drive.')
  }

  const handleDownload = (surat) => {
    if (!surat.google_drive_id) {
      alert('File tidak tersedia untuk diunduh')
      return
    }
    const url = getFileUrl(surat.id, 'attachment')
    const a = document.createElement('a')
    a.href = url
    a.download = surat.nama_surat || 'document'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePrint = (surat) => {
    if (!surat.google_drive_id && !surat.file_path) {
      alert('File tidak tersedia untuk print')
      return
    }
    window.dispatchEvent(new CustomEvent('collapseSidebar'))
    setPreviewModal({ show: true, surat, autoPrint: true })
  }

  const filteredSurats = surats.filter(surat =>
    surat.nomor_surat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    surat.nama_pengirim?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    surat.nama_surat?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4B164C]">Surat Masuk</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola surat masuk dengan tampilan ringkas dan bersih.</p>
        </div>
        <Link
          to="/surat/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:opacity-90 self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
        >
          <i className="bi bi-plus-lg" />
          Tambah Surat
        </Link>
      </div>

      {/* Toast Alert */}
      {toast.show && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
          toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-3">
            <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-triangle-fill text-red-500' : 'bi-check-circle-fill text-emerald-500'} text-lg`} />
            <span className="font-medium">{toast.message}</span>
          </div>
          <button onClick={() => setToast({ ...toast, show: false })} className="text-slate-400 hover:text-slate-600">
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* Reconnect Google Banner */}
      {reconnectNeeded && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Your Google connection needs to be renewed.</p>
              <p className="text-xs text-amber-700">Please reconnect your Google account to sync your letters with Google Drive &amp; Sheets.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReconnectGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <i className="bi bi-google" /> Reconnect Google
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#4B164C] border border-purple-100">
              {surats.length} Surat
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor, pengirim, atau perihal…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-[#DD88CF] focus:ring-2 focus:ring-[#DD88CF]/20 transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <i className="bi bi-arrow-repeat text-4xl mb-3 block animate-spin" />
              Memuat data...
            </div>
          ) : (
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="bg-[#FAF7FC]">
                  <th className="w-12 text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Nomor Surat</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Perihal</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Pengirim</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Folder</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Tgl Buat</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Tgl Masuk</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSurats.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-slate-400">
                      <i className="bi bi-inbox text-4xl block mb-3 text-slate-300" />
                      <p className="text-sm">Tidak ada data surat masuk</p>
                    </td>
                  </tr>
                ) : (
                  filteredSurats.map((surat, index) => (
                    <tr key={surat.id} className="hover:bg-purple-50/30 transition">
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#4B164C] bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg text-xs inline-block">
                          {surat.nomor_surat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{surat.nama_surat}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{surat.nama_pengirim}</td>
                      <td className="py-3 px-4 text-sm">
                        {surat.folder_name ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-[#4B164C] border border-purple-100">
                            <i className="bi bi-folder mr-1.5" />
                            {surat.folder_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Default</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {new Date(surat.tanggal_buat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {new Date(surat.tanggal_masuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(surat)}
                            title="Lihat file langsung"
                            aria-label="View document"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-[#4B164C] border border-purple-200 hover:bg-[#4B164C] hover:text-white hover:border-[#4B164C] transition"
                          >
                            <i className="bi bi-box-arrow-up-right text-xs" />
                          </button>
                          <button
                            onClick={() => handlePreview(surat)}
                            title="Preview file"
                            aria-label="Preview dokumen"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition"
                          >
                            <i className="bi bi-eye text-xs" />
                          </button>
                          <button
                            onClick={() => handleDownload(surat)}
                            title="Unduh file"
                            aria-label="Download document"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition"
                          >
                            <i className="bi bi-download text-xs" />
                          </button>
                          <button
                            onClick={() => handlePrint(surat)}
                            title="Print dokumen"
                            aria-label="Print document"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white hover:border-green-500 transition"
                          >
                            <i className="bi bi-printer text-xs" />
                          </button>
                          <Link
                            to={`/surat/${surat.id}/edit`}
                            title="Edit surat"
                            aria-label="Edit surat"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition"
                          >
                            <i className="bi bi-pencil text-xs" />
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ show: true, id: surat.id, name: surat.nama_surat })}
                            title="Hapus surat"
                            aria-label="Hapus surat"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition"
                          >
                            <i className="bi bi-trash text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="bi bi-trash text-xl text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Hapus Surat?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Apakah Anda yakin ingin menghapus <strong className="text-gray-700">{deleteModal.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteModal.id)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        show={previewModal.show}
        onClose={handleClosePreview}
        surat={previewModal.surat}
        autoPrint={previewModal.autoPrint}
        apiEndpoint={previewModal.surat ? `/api/surat/${previewModal.surat.id}/file` : ''}
      />
    </div>
  )
}
