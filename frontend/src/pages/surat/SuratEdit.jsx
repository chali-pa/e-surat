import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'

export default function SuratEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nomor_surat: '',
    nama_pengirim: '',
    tanggal_masuk: '',
    tanggal_buat: '',
    nama_surat: '',
    file_surat: null
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [reconnectNeeded, setReconnectNeeded] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchSurat()
  }, [id])

  const fetchSurat = async () => {
    try {
      const response = await api.get(`/api/surat/${id}`)
      const surat = response.data.data
      setFormData({
        nomor_surat: surat.nomor_surat || '',
        nama_pengirim: surat.nama_pengirim || '',
        tanggal_masuk: surat.tanggal_masuk?.split('T')[0] || '',
        tanggal_buat: surat.tanggal_buat?.split('T')[0] || '',
        nama_surat: surat.nama_surat || '',
        file_surat: null
      })
    } catch (error) {
      console.error('Failed to fetch surat:', error)
      navigate('/surat')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    const data = new FormData()
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) {
        data.append(key, formData[key])
      }
    })

    try {
      const response = await api.post(`/api/surat/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        setSuccessMessage('Data berhasil diperbarui. Perubahan telah disinkronisasi dengan Google Sheet dan Google Drive.')
        setTimeout(() => {
          navigate('/surat')
        }, 2000)
      }
    } catch (error) {
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true)
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message })
      } else {
        setErrors({ general: 'Failed to update surat. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#F9FAFB]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-[#4B164C] to-[#DD88CF] shadow-md p-5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center rounded-2xl mb-8">
          <h2 className="text-xl font-bold text-white">Edit Surat</h2>
          <Link to="/surat" className="text-white hover:text-gray-200 transition flex items-center gap-2 font-medium">
            <i className="bi bi-arrow-left"></i> Kembali
          </Link>
        </header>

        {/* Form Card */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-8">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 border border-green-100 flex items-center gap-3">
              <i className="bi bi-check-circle-fill text-xl"></i>
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Error Messages */}
          {errors.general && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
              {errors.general}
            </div>
          )}

          {/* Reconnect Google Banner */}
          {reconnectNeeded && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 mb-6">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Your Google connection needs to be renewed.</p>
                  <p className="text-xs text-amber-700">Please reconnect your Google account to sync your letters with Google Drive & Sheets.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
                  const user = JSON.parse(localStorage.getItem('user') || '{}')
                  window.location.href = `${apiBaseUrl}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
              >
                <i className="bi bi-google" /> Reconnect Google
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Surat</label>
                <input
                  type="text"
                  value={formData.nomor_surat}
                  onChange={(e) => setFormData({ ...formData, nomor_surat: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition ${errors.nomor_surat ? 'border-red-400' : 'border-gray-200'}`}
                  required
                />
                {errors.nomor_surat && <p className="text-red-500 text-xs mt-1">{errors.nomor_surat}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Pengirim</label>
                <input
                  type="text"
                  value={formData.nama_pengirim}
                  onChange={(e) => setFormData({ ...formData, nama_pengirim: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition ${errors.nama_pengirim ? 'border-red-400' : 'border-gray-200'}`}
                  required
                />
                {errors.nama_pengirim && <p className="text-red-500 text-xs mt-1">{errors.nama_pengirim}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Masuk</label>
                <input
                  type="date"
                  value={formData.tanggal_masuk}
                  onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition ${errors.tanggal_masuk ? 'border-red-400' : 'border-gray-200'}`}
                  required
                />
                {errors.tanggal_masuk && <p className="text-red-500 text-xs mt-1">{errors.tanggal_masuk}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Buat</label>
                <input
                  type="date"
                  value={formData.tanggal_buat}
                  onChange={(e) => setFormData({ ...formData, tanggal_buat: e.target.value })}
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition ${errors.tanggal_buat ? 'border-red-400' : 'border-gray-200'}`}
                  required
                />
                {errors.tanggal_buat && <p className="text-red-500 text-xs mt-1">{errors.tanggal_buat}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Surat</label>
              <input
                type="text"
                value={formData.nama_surat}
                onChange={(e) => setFormData({ ...formData, nama_surat: e.target.value })}
                className={`w-full border rounded-xl px-4 py-3 outline-none transition ${errors.nama_surat ? 'border-red-400' : 'border-gray-200'}`}
                required
              />
              {errors.nama_surat && <p className="text-red-500 text-xs mt-1">{errors.nama_surat}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload File Surat (Opsional)</label>
              <input
                type="file"
                onChange={(e) => setFormData({ ...formData, file_surat: e.target.files[0] })}
                className={`w-full border rounded-xl px-4 py-3 outline-none transition ${errors.file_surat ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.file_surat && <p className="text-red-500 text-xs mt-1">{errors.file_surat}</p>}
              <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengganti file</p>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-[#4B164C] to-[#DD88CF] text-white font-semibold rounded-xl hover:opacity-90 transition shadow-md disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Update Surat'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
