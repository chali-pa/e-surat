import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('masuk')
  const [surats, setSurats] = useState([])
  const [suratsKeluar, setSuratsKeluar] = useState([])
  const [loading, setLoading] = useState(true)
  const [reconnectNeeded, setReconnectNeeded] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [masukRes, keluarRes] = await Promise.all([
        api.get('/api/surat'),
        api.get('/api/surat-keluar'),
      ])
      setSurats(masukRes.data.data || [])
      setSuratsKeluar(keluarRes.data.data || keluarRes.data.surats || [])
    } catch (error) {
      if (error.response?.data?.error_code === 'GOOGLE_RECONNECT_REQUIRED') {
        setReconnectNeeded(true)
      }
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReconnectGoogle = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    window.location.href = `${apiBaseUrl}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4B164C]">Halaman Utama</h1>
          <p className="mt-1 text-sm text-slate-500">Selamat datang kembali! Berikut sekilas tentang surat Anda.</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('masuk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'masuk'
                ? 'bg-[#4B164C] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className="bi bi-envelope-fill text-xs" />
            Surat Masuk
          </button>
          <button
            onClick={() => setActiveTab('keluar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'keluar'
                ? 'bg-[#4B164C] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className="bi bi-send-fill text-xs" />
            Surat Keluar
          </button>
        </div>
      </div>

      {/* Reconnect Google Banner */}
      {reconnectNeeded && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Your Google connection needs to be renewed.</p>
              <p className="text-xs text-amber-700">Please reconnect your Google account to sync your letters with Google Drive & Sheets.</p>
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

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <i className="bi bi-arrow-repeat text-4xl animate-spin" />
          <p className="text-sm">Memuat data...</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Surat Masuk Card */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 transition-all duration-200 ${activeTab === 'keluar' ? 'opacity-40 scale-[0.98]' : ''}`}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f3e8f7, #e9d5f0)' }}>
            <i className="bi bi-envelope-paper-fill text-2xl text-[#4B164C]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Surat Masuk</p>
            <p className="text-3xl font-bold text-slate-900 mt-0.5">{surats.length}</p>
          </div>
          <Link
            to="/surat/create"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm whitespace-nowrap transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            <i className="bi bi-plus-lg" />
            Tambah
          </Link>
        </div>

        {/* Surat Keluar Card */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 transition-all duration-200 ${activeTab === 'masuk' ? 'opacity-40 scale-[0.98]' : ''}`}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
            <i className="bi bi-send-fill text-2xl text-[#4B164C]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Surat Keluar</p>
            <p className="text-3xl font-bold text-slate-900 mt-0.5">{suratsKeluar.length}</p>
          </div>
          <Link
            to="/surat-keluar/create"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm whitespace-nowrap transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
          >
            <i className="bi bi-plus-lg" />
            Tambah
          </Link>
        </div>
      </div>

      {/* Surat Masuk Table */}
      {activeTab === 'masuk' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Riwayat Surat Masuk</h2>
              <p className="text-xs text-slate-400 mt-0.5">Semua surat masuk tercatat di sini</p>
            </div>
            <Link to="/surat" className="text-xs font-medium text-[#4B164C] hover:underline">Lihat semua →</Link>
          </div>
          {surats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <i className="bi bi-inbox text-2xl text-slate-300" />
              </div>
              <p className="text-sm">Belum ada surat masuk.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {surats.map((surat) => (
                <div key={surat.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: '#f3eaf4', color: '#4B164C' }}>
                    {surat.nama_surat?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{surat.nama_surat}</p>
                    <p className="text-xs text-slate-400 truncate">{surat.nomor_surat} · {surat.nama_pengirim}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(surat.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Surat Keluar Table */}
      {activeTab === 'keluar' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Riwayat Surat Keluar</h2>
              <p className="text-xs text-slate-400 mt-0.5">Semua surat keluar tercatat di sini</p>
            </div>
            <Link to="/surat-keluar" className="text-xs font-medium text-[#4B164C] hover:underline">Lihat semua →</Link>
          </div>
          {suratsKeluar.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <i className="bi bi-inbox text-2xl text-slate-300" />
              </div>
              <p className="text-sm">Belum ada surat keluar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {suratsKeluar.map((surat) => (
                <div key={surat.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: '#ede9fe', color: '#4B164C' }}>
                    {surat.nama_surat?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{surat.nama_surat}</p>
                    <p className="text-xs text-slate-400 truncate">{surat.nomor_surat} · {surat.nama_penerima}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(surat.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
