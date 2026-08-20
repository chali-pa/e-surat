import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

export default function GoogleIntegration() {
  const [status, setStatus] = useState({
    connected: false,
    provisioned: false,
    email: '',
    googleName: '',
    googleEmail: '',
    driveFolderId: null,
    driveKeluarFolderId: null,
    sheetMasukId: null,
    sheetKeluarId: null,
  })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [message, setMessage] = useState(null)

  const checkConnection = useCallback(async () => {
    try {
      const response = await api.get('/api/google/status')
      if (response.data.success) {
        setStatus({
          connected: !!response.data.connected,
          provisioned: !!response.data.provisioned,
          email: response.data.email || '',
          googleName: response.data.googleName || '',
          googleEmail: response.data.googleEmail || '',
          driveFolderId: response.data.driveFolderId,
          driveKeluarFolderId: response.data.driveKeluarFolderId,
          sheetMasukId: response.data.sheetMasukId,
          sheetKeluarId: response.data.sheetKeluarId,
        })
      }
    } catch (error) {
      console.error('Failed to check Google status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()

    const handleGoogleLinked = (e) => {
      checkConnection()
      if (e?.detail?.success) {
        setMessage({ type: 'success', text: e.detail.success })
      }
    }

    window.addEventListener('google-linked', handleGoogleLinked)
    return () => window.removeEventListener('google-linked', handleGoogleLinked)
  }, [checkConnection])

  const handleConnect = () => {
    setConnecting(true)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userId = user.id ? `?userId=${user.id}` : ''
    window.location.href = `${apiBaseUrl}/api/google/connect${userId}`
  }

  const handleProvision = async () => {
    setProvisioning(true)
    setMessage(null)
    try {
      const response = await api.post('/api/google/provision')
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message || 'Drive & Sheets berhasil disiapkan!' })
        await checkConnection()
      }
    } catch (error) {
      console.error('Provision error:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Gagal menyiapkan Drive & Sheets. Silakan coba hubungkan ulang Google.'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setProvisioning(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await api.post('/api/google/disconnect')
      if (response.data.success) {
        setStatus((prev) => ({ 
          ...prev, 
          connected: false,
          provisioned: false,
          googleName: '',
          googleEmail: ''
        }))
        setMessage({ type: 'success', text: response.data.message || 'Koneksi Google berhasil diputus.' })
        
        // Update localStorage user object
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        user.google_connected = false
        localStorage.setItem('user', JSON.stringify(user))
        window.dispatchEvent(new Event('auth-change'))
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal memutus koneksi Google' })
    }
  }

  if (loading) {
    return <div className="text-slate-500 text-xs">Memeriksa koneksi Google...</div>
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Integrasi Google API</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap pengguna mengelola Google Drive dan Google Sheets pribadi milik sendiri.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}
        >
          <span>{message.text}</span>
          <button 
            type="button" 
            onClick={() => setMessage(null)} 
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>
      )}

      {status.connected ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 text-lg">
              <i className="bi bi-check-circle-fill" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-emerald-900 text-sm">Akun Google Terhubung</p>
                {status.provisioned ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                    Drive & Sheets Siap
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    Setup Tertunda
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-700 mt-0.5 truncate">
                {status.googleName ? `${status.googleName} (${status.googleEmail || status.email})` : (status.googleEmail || status.email)}
              </p>
              
              <div className="mt-2 text-[11px] text-emerald-800 space-y-0.5 font-mono">
                <p className="flex items-center gap-1.5">
                  <i className={`bi ${status.driveFolderId ? 'bi-check-lg text-emerald-600' : 'bi-dash-circle text-amber-500'}`} />
                  Folder Incoming: <span className="font-semibold">esurat</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <i className={`bi ${status.driveKeluarFolderId ? 'bi-check-lg text-emerald-600' : 'bi-dash-circle text-amber-500'}`} />
                  Folder Outgoing: <span className="font-semibold">esurat-keluar</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <i className={`bi ${status.sheetMasukId ? 'bi-check-lg text-emerald-600' : 'bi-dash-circle text-amber-500'}`} />
                  Spreadsheet Masuk: <span className="font-semibold">E-Surat Masuk</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <i className={`bi ${status.sheetKeluarId ? 'bi-check-lg text-emerald-600' : 'bi-dash-circle text-amber-500'}`} />
                  Spreadsheet Keluar: <span className="font-semibold">E-Surat Keluar</span>
                </p>
              </div>
            </div>
          </div>

          {!status.provisioned && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <i className="bi bi-info-circle-fill text-amber-500 text-sm" />
                <span>Folder Drive atau Spreadsheet belum lengkap dibuat.</span>
              </div>
              <button
                type="button"
                onClick={handleProvision}
                disabled={provisioning}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition disabled:opacity-50 whitespace-nowrap"
              >
                {provisioning ? 'Menyiapkan...' : 'Siapkan Ulang Drive & Sheets'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleConnect}
              disabled={connecting || provisioning}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <i className="bi bi-arrow-repeat text-slate-500" /> Hubungkan Ulang / Ganti Akun Google
            </button>

            <button
              onClick={handleDisconnect}
              disabled={connecting || provisioning}
              className="py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"
            >
              Putus Koneksi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 text-lg">
              <i className="bi bi-exclamation-triangle-fill" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">Integrasi Google Belum Terhubung</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Hubungkan akun Google Anda agar surat otomatis tersimpan ke Google Drive & Google Sheets pribadi Anda.
              </p>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-sm transition hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            {connecting ? (
              'Memproses...'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Hubungkan Akun Google Anda
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
