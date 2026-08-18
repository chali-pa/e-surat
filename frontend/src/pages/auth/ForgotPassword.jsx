import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      const response = await api.post('/api/forgot-password', { email })

      if (response.data.success || response.status === 200) {
        setSuccess(true)
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message })
      } else {
        setErrors({ general: 'Failed to send reset link. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0d0015' }}>
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[45%] bg-white flex flex-col p-8 lg:p-[60px_56px] relative z-10 overflow-y-auto max-h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-9">
          <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 sm:h-11 w-auto object-contain transition-all duration-300" />
        </div>

        <h1 className="text-[clamp(1.4rem,6vw,1.75rem)] font-extrabold mb-1.5" style={{ color: '#1a1a2e', letterSpacing: '-0.5px' }}>
          Lupa Password?
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Masukkan email Anda untuk menerima link reset password.
        </p>

        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-3.5 p-4 rounded-xl mb-6" style={{ background: 'linear-gradient(to right, #fff, #f0fdf4)', border: '1px solid #dcfce7', borderLeft: '4px solid #10b981', color: '#14532d' }}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#dcfce7', color: '#10b981' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">Link Terkirim</div>
              <div>Link reset password telah dikirim ke email Anda.</div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {errors.general && (
          <div className="flex items-start gap-3.5 p-4 rounded-xl mb-6" style={{ background: 'linear-gradient(to right, #fff, #fef2f2)', border: '1px solid #fee2e2', borderLeft: '4px solid #ef4444', color: '#7f1d1d' }}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">Terdapat Kesalahan</div>
              <div>{errors.general}</div>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151', letterSpacing: '0.02em' }}>
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                  style={{ background: '#fafafa', color: '#1a1a2e' }}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M3 7l9 6 9-6" />
                    <path d="M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7" />
                  </svg>
                </span>
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 rounded-xl font-bold text-sm transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #4B164C, #a0359b)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(75, 22, 76, 0.4)',
                letterSpacing: '0.02em'
              }}
            >
              {loading ? 'Memproses...' : 'Kirim Link Reset'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-gray-500 mt-6">
          Ingat password? <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-800">Masuk sekarang</Link>
        </div>
      </div>

      {/* Right Panel - Decoration */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0d0015 0%, #1a0020 40%, #4B164C 100%)' }}>
        {/* Animated blobs */}
        <div className="absolute rounded-full blur-[80px] opacity-70" style={{ width: '420px', height: '420px', background: 'radial-gradient(circle, #DD88CF, #9b3fa0)', top: '-80px', right: '-60px' }}></div>
        <div className="absolute rounded-full blur-[80px] opacity-70" style={{ width: '350px', height: '350px', background: 'radial-gradient(circle, #4B164C, #7b1f7d)', bottom: '-60px', left: '-40px' }}></div>
        <div className="absolute rounded-full blur-[80px] opacity-70" style={{ width: '260px', height: '260px', background: 'radial-gradient(circle, #f0a8e6, #c75cc9)', top: '40%', left: '30%' }}></div>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 text-center z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: '#f9d5f4', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>
            ✦ E-Surat
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)', letterSpacing: '-1px' }}>
            Reset Password<br /><span style={{ color: '#f9d5f4' }}>dengan mudah</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px' }}>
            Dapatkan akses kembali ke akun Anda dalam beberapa langkah sederhana.
          </p>
        </div>
      </div>
    </div>
  )
}
