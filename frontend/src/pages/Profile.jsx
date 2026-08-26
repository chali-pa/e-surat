import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api/axios'
import GoogleIntegration from '../components/GoogleIntegration'
import LogoutConfirmDialog from '../components/LogoutConfirmDialog'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ── Profile data ────────────────────────────────────────────────────────
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [googleBanner, setGoogleBanner] = useState(null)

  // ── Delete account state ─────────────────────────────────────────────────
  // Kept fully separate from logout — different handler, different modal, different state.
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // ── Logout state ─────────────────────────────────────────────────────────
  // Completely independent of delete-account state above — no shared variables.
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(userData)
    setFormData({ name: userData.name || '', email: userData.email || '' })

    const params = new URLSearchParams(location.search)
    if (params.get('google_linked') === '1' || location.state?.success) {
      setGoogleBanner({
        type: 'success',
        text: location.state?.success || 'Akun Google berhasil dihubungkan! Folder Drive dan Google Sheets pribadi Anda telah disiapkan.',
      })
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    const fetchLatestProfile = async () => {
      try {
        const res = await api.get('/api/profile')
        if (res.data.success && res.data.user) {
          const fresh = res.data.user
          setUser(prev => ({ ...prev, ...fresh }))
          setFormData({ name: fresh.name || '', email: fresh.email || '' })
        }
      } catch (err) {
        console.error('Failed to refresh profile:', err)
      }
    }
    fetchLatestProfile()
  }, [location])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUpdate = async (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    setSaved(false)
    try {
      const res = await api.put('/api/profile', formData)
      if (res.data.success) {
        const updatedUser = { ...user, name: formData.name, email: formData.email }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        setSaved(true)
        window.dispatchEvent(new Event('auth-change'))
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      setErrors({ general: err.response?.data?.error || 'Gagal memperbarui profil. Silakan coba lagi.' })
    } finally {
      setSaving(false)
    }
  }

  // Delete-account handler — independent from logout
  const handleDeleteAccount = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      await api.delete('/api/profile')
      logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setDeleteError(error.response?.data?.error || 'Gagal menghapus akun. Silakan coba lagi.')
      setDeleting(false)
    }
  }

  // Logout handler — independent from delete-account handler above
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      await api.post('/api/logout')
    } catch (error) {
      // Non-fatal: always proceed with client-side cleanup
      console.error('Logout server call failed:', error)
    } finally {
      logout()
      setShowLogoutModal(false)
      navigate('/login', { replace: true })
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const initials = formData.name
    ? formData.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const DELETE_KEYWORD = 'HAPUS'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[#4B164C]">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola informasi akun dan integrasi Anda.</p>
      </div>

      {/* ── Google-linked banner ──────────────────────────────────────── */}
      {googleBanner && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-sm border ${
          googleBanner.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            <i className={`bi ${
              googleBanner.type === 'success'
                ? 'bi-check-circle-fill text-emerald-500'
                : 'bi-exclamation-triangle-fill text-red-500'
            } text-lg flex-shrink-0`} />
            <span className="font-medium">{googleBanner.text}</span>
          </div>
          <button onClick={() => setGoogleBanner(null)} className="text-slate-400 hover:text-slate-600 ml-3 flex-shrink-0">
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* ── Profile hero card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div
          className="h-28 w-full relative"
          style={{ background: 'linear-gradient(135deg, #4B164C 0%, #7B2D7C 55%, #DD88CF 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 left-16 w-20 h-20 rounded-full bg-white/5" />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between gap-3 -mt-10">
            <div
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
            >
              {initials}
            </div>

            {/* Active status pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Aktif</span>
            </div>
          </div>

          {/* Name, email, member label */}
          <div className="mt-3">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {formData.name || 'Nama Pengguna'}
            </h2>
            <p className="text-sm text-slate-400 truncate mt-0.5">
              {formData.email || 'email@contoh.com'}
            </p>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <i className="bi bi-person-badge" />
              Anggota E-Surat
            </p>
          </div>
        </div>
      </div>

      {/* ── Account info form ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <i className="bi bi-person-gear text-[#4B164C]" />
            Informasi Akun
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Perbarui nama dan alamat email Anda</p>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-5">
          {saved && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              <i className="bi bi-check-circle-fill text-emerald-500 flex-shrink-0" />
              Profil berhasil diperbarui!
            </div>
          )}
          {errors.general && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <i className="bi bi-exclamation-circle-fill text-red-400 flex-shrink-0" />
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Nama Lengkap</label>
              <div className="relative">
                <i className="bi bi-person absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 ${
                    errors.name
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-[#DD88CF] focus:ring-[#DD88CF]/20'
                  }`}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Alamat Email</label>
              <div className="relative">
                <i className="bi bi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none transition focus:ring-2 ${
                    errors.email
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-[#DD88CF] focus:ring-[#DD88CF]/20'
                  }`}
                  placeholder="Masukkan alamat email"
                  required
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
            >
              {saving ? (
                <><i className="bi bi-arrow-repeat animate-spin" /> Menyimpan...</>
              ) : (
                <><i className="bi bi-floppy" /> Simpan Perubahan</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Google Integration ────────────────────────────────────────── */}
      <GoogleIntegration />

      {/* ── Session section — logout lives here, not in Danger Zone ─────
           Logout is a routine action. Placing it in its own card keeps it
           visually distinct from the irreversible delete-account action below. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <i className="bi bi-shield-lock text-[#4B164C]" />
            Sesi
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Kelola sesi aktif akun Anda</p>
        </div>

        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Keluar dari akun</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Akhiri sesi ini. Anda dapat masuk kembali kapan saja.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition whitespace-nowrap"
          >
            <i className="bi bi-box-arrow-right" />
            Keluar
          </button>
        </div>
      </div>

      {/* ── Danger Zone — delete account only ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <i className="bi bi-shield-exclamation" />
            Zona Berbahaya
          </h3>
          <p className="text-xs text-red-400 mt-0.5">Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan</p>
        </div>

        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Hapus Akun</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Semua data Anda termasuk surat-surat akan dihapus secara permanen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText('')
              setDeleteError('')
              setShowDeleteModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition whitespace-nowrap"
          >
            <i className="bi bi-trash3" />
            Hapus Akun Saya
          </button>
        </div>
      </div>

      {/* ── Logout confirmation dialog ────────────────────────────────────
           Uses LogoutConfirmDialog — completely independent from the delete
           modal below. Separate state, separate handler, separate component. */}
      <LogoutConfirmDialog
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        loading={isLoggingOut}
      />

      {/* ── Delete account modal ──────────────────────────────────────────
           Kept exactly as before — no changes to its logic or wording.      */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <i className="bi bi-trash3 text-lg text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-800">Hapus Akun Secara Permanen?</h3>
                <p className="text-xs text-red-400 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <i className="bi bi-exclamation-triangle-fill" /> Yang akan terhapus:
                </p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Semua data profil akun Anda</li>
                  <li>Seluruh surat masuk dan surat keluar</li>
                  <li>Koneksi Google yang terhubung</li>
                </ul>
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <i className="bi bi-exclamation-circle-fill text-red-400 flex-shrink-0" />
                  {deleteError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Ketik{' '}
                  <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                    {DELETE_KEYWORD}
                  </span>{' '}
                  untuk konfirmasi
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition font-mono tracking-widest"
                  placeholder={DELETE_KEYWORD}
                  disabled={deleting}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition text-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== DELETE_KEYWORD || deleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><i className="bi bi-arrow-repeat animate-spin" /> Menghapus...</>
                ) : (
                  <><i className="bi bi-trash3" /> Ya, Hapus Akun</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
