import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const recaptchaRef = useRef(null)

  useEffect(() => {
    // Load reCAPTCHA when component mounts
    const loadRecaptcha = () => {
      if (
        window.grecaptcha && 
        recaptchaRef.current && 
        !recaptchaRef.current.hasAttribute('data-recaptcha-rendered')
      ) {
        recaptchaRef.current.setAttribute('data-recaptcha-rendered', 'true')
        try {
          window.grecaptcha.render(recaptchaRef.current, {
            sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lc-xxxxx',
            callback: (token) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(null)
          })
        } catch (error) {
          console.error('reCAPTCHA render error:', error)
          recaptchaRef.current.removeAttribute('data-recaptcha-rendered')
        }
      }
    }

    if (window.grecaptcha) {
      loadRecaptcha()
    } else {
      window.addEventListener('recaptcha-loaded', loadRecaptcha)
    }

    return () => {
      window.removeEventListener('recaptcha-loaded', loadRecaptcha)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    if (!captchaToken) {
      setErrors({ general: 'Harap selesaikan CAPTCHA.' })
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/api/register', {
        ...formData,
        'g-recaptcha-response': captchaToken
      })

      if (response.data.success || response.data.token) {
        login(response.data.token, response.data.user)
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message })
      } else if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error })
      } else {
        setErrors({ general: 'Registration failed. Please try again.' })
      }
      // Reset CAPTCHA on error
      if (window.grecaptcha) {
        window.grecaptcha.reset()
        setCaptchaToken(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/google/connect`
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0d0015' }}>
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[45%] bg-white flex flex-col p-8 lg:p-[60px_56px] relative z-10 overflow-y-auto max-h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-12 sm:h-14 w-auto object-contain transition-all duration-300" />
        </div>

        <h1 className="text-[clamp(1.5rem,6vw,2rem)] font-extrabold mb-2" style={{ color: '#1a1a2e', letterSpacing: '-0.5px' }}>
          Buat Akun Baru
        </h1>
        <p className="text-sm text-gray-500 mb-10 leading-relaxed">
          Daftar untuk mulai mengelola surat elektronik Anda dengan mudah dan efisien.
        </p>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8 gap-1">
          <Link to="/login" className="flex-1 py-2 px-5 rounded-lg text-sm font-semibold text-gray-500 transition-all hover:text-gray-700">
            Masuk
          </Link>
          <Link to="/register" className="flex-1 py-2 px-5 rounded-lg text-sm font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #4B164C, #9c2fa0)', boxShadow: '0 4px 12px rgba(75, 22, 76, 0.35)' }}>
            Daftar
          </Link>
        </div>

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

        {/* Register Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4.5">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151', letterSpacing: '0.02em' }}>
              Nama Lengkap
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama lengkap"
                className={`w-full p-3 border rounded-xl text-sm outline-none transition ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                style={{ background: '#fafafa', color: '#1a1a2e' }}
                required
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4.5">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151', letterSpacing: '0.02em' }}>
              Alamat Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

          <div className="mb-4.5">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151', letterSpacing: '0.02em' }}>
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Masukkan password"
                className={`w-full p-3 border rounded-xl text-sm outline-none transition ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                style={{ background: '#fafafa', color: '#1a1a2e' }}
                required
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151', letterSpacing: '0.02em' }}>
              Konfirmasi Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.password_confirmation}
                onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                placeholder="Ulangi password"
                className={`w-full p-3 border rounded-xl text-sm outline-none transition ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                style={{ background: '#fafafa', color: '#1a1a2e' }}
                required
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* reCAPTCHA */}
          <div className="mb-6">
            <div ref={recaptchaRef} className="g-recaptcha"></div>
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
            {loading ? 'Memproses...' : 'Daftar Akun'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400 whitespace-nowrap">atau lanjutkan dengan</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 p-3 rounded-xl font-semibold text-sm transition-all border border-gray-200 bg-white hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Daftar dengan Google
        </button>

        <div className="text-center text-xs text-gray-500 mt-6">
          Sudah punya akun? <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-800">Masuk sekarang</Link>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-3">
          <Link to="/privacy-policy" className="text-gray-400 hover:text-[#4B164C] transition">Kebijakan Privasi</Link>
          <span className="text-gray-300">•</span>
          <Link to="/terms-of-service" className="text-gray-400 hover:text-[#4B164C] transition">Syarat & Ketentuan</Link>
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
            Kelola Surat<br /><span style={{ color: '#f9d5f4' }}>lebih praktis</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '300px' }}>
            Sistem digital untuk mengatur surat dengan cepat dan terorganisir.
          </p>
        </div>
      </div>
    </div>
  )
}
