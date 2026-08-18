import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF7FB', fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center">
            <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-12 sm:h-14 md:h-20 w-auto object-contain transition-all duration-300" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-white font-medium text-sm sm:text-base transition hover:bg-white/20"
                  style={{ background: 'rgba(87,36,95,.25)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.15)' }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-white font-medium text-sm sm:text-base transition hover:bg-white/20"
                  style={{ background: 'rgba(87,36,95,.25)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.15)' }}
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-white font-medium text-sm sm:text-base transition hover:bg-white/20"
                  style={{ background: 'rgba(87,36,95,.25)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.15)' }}
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-white font-medium text-sm sm:text-base transition hover:bg-white/20"
                  style={{ background: 'rgba(87,36,95,.25)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.15)' }}
                >
                  Daftar
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #D57BC6 0%, #B14FB2 45%, #742B88 100%)', padding: '150px 0 120px' }}>
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_80%,rgba(255,255,255,.12),transparent_70%)] pointer-events-none"></div>
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white mb-6" style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Sistem Manajemen Surat
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '-0.01em' }}>
                Urus surat jauh<br /><span style={{ color: '#FCE4FA', fontStyle: 'normal' }}>lebih mudah.</span>
              </h1>
              <p className="text-white/90 text-sm sm:text-base lg:text-lg font-light leading-relaxed mb-8 max-w-[460px]">
                Satu tempat untuk mencatat, mengunggah, dan memantau status setiap surat — dari belum direspon sampai selesai. Nggak perlu lagi bolak-balik buku agenda atau kehilangan berkas penting.
              </p>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-white text-[#7A2D7C] font-semibold text-sm sm:text-base px-5 sm:px-7 py-3 sm:py-4 rounded-full transition hover:bg-[#F6E9F5] hover:-translate-y-0.5"
                >
                  Masuk ke Dashboard →
                </Link>
                <a
                  href="#fitur"
                  className="inline-flex items-center gap-2 text-white font-medium text-sm sm:text-base py-3 sm:py-4 border-b-2 border-white/60 transition hover:border-white"
                >
                  Lihat cara kerja
                </a>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="relative h-[220px] sm:h-[280px] lg:h-[360px] max-w-[420px] mx-auto w-full">
              <div className="absolute w-[78%] bg-white rounded-2xl shadow-2xl p-4 sm:p-6" style={{ boxShadow: '0 20px 50px rgba(58,17,60,.35)' }}>
                {/* Card Back */}
                <div className="absolute top-0 left-[10%] -rotate-6 opacity-75 h-[52%] bg-white rounded-2xl shadow-lg p-4"></div>
                {/* Card Mid */}
                <div className="absolute top-[9%] left-[2%] rotate-3 opacity-92 h-[55%] bg-white rounded-2xl shadow-lg p-4"></div>
                {/* Card Front */}
                <div className="relative top-[20%] left-[8%] h-[58%] bg-white rounded-2xl shadow-xl p-4 sm:p-6 z-10">
                  <div className="text-xs font-medium text-gray-400 mb-2.5">No. 005/ST/VII/2026</div>
                  <div className="h-2 bg-gray-200 rounded mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded mb-2.5"></div>
                  <div className="h-2 bg-gray-200 rounded w-[55%] mb-3"></div>
                  <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full mt-3" style={{ background: 'rgba(122,45,124,.1)', color: '#7A2D7C' }}>
                    Lihat surat
                  </span>
                </div>
              </div>
              {/* Stamp Badge */}
              <svg className="absolute right-[2%] bottom-[2%] w-[80px] sm:w-[100px] lg:w-[118px] h-[80px] sm:h-[100px] lg:h-[118px] -rotate-11 z-20" style={{ filter: 'drop-shadow(0 10px 20px rgba(58,17,60,.35))' }} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                <circle cx="70" cy="70" r="64" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.95"/>
                <circle cx="70" cy="70" r="53" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.8"/>
                <text x="70" y="78" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="24" fill="#ffffff" textAnchor="middle">OK</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 sm:mb-16 max-w-[560px]">
            <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#7A2D7C' }}>
              Fitur utama
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 leading-tight">
              Semua yang kamu butuhkan untuk urus surat, dalam satu tempat.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-4 text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #DD88CF, #7A2D7C)' }}>
                01
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Catat surat dalam sekejap</h3>
              <p className="text-gray-500 text-sm sm:text-base font-light leading-relaxed">
                Isi nomor surat, tanggal surat dibuat, tanggal diterima, dan nama pengirim lewat satu form sederhana — siapa pun bisa langsung pakai tanpa perlu pelatihan khusus.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-4 text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #DD88CF, #7A2D7C)' }}>
                02
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Simpan berkas asli dengan aman</h3>
              <p className="text-gray-500 text-sm sm:text-base font-light leading-relaxed">
                Unggah file surat (PDF, JPG, PNG, DOC, atau DOCX hingga 100MB) langsung dari HP atau komputer — tidak ada lagi berkas fisik yang hilang atau tercecer.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-4 text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #DD88CF, #7A2D7C)' }}>
                03
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Temukan surat apa pun dalam hitungan detik</h3>
              <p className="text-gray-500 text-sm sm:text-base font-light leading-relaxed">
                Cukup ketik nomor, nama pengirim, atau perihal surat untuk langsung menemukannya, lalu lihat, cetak, atau bagikan sesuai kebutuhan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Banner */}
      <section className="relative mx-4 sm:mx-6 lg:mx-auto max-w-[1180px] rounded-2xl sm:rounded-3xl overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 80% 20%, #DD88CF 0%, #A24BA0 45%, #7A2D7C 100%)', padding: '40px 0 80px' }}>
        <div className="px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
          <div>
            <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-2.5 max-w-[460px]">
              Selamat datang kembali.
            </h3>
            <p className="text-white/85 text-sm sm:text-base font-light leading-relaxed max-w-[420px]">
              Yuk, mulai kelola surat hari ini dengan lebih rapi dan efisien.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-[#7A2D7C] font-semibold text-base px-6 sm:px-8 py-3.5 rounded-full transition hover:bg-[#F6E9F5] whitespace-nowrap"
          >
            Masuk ke Dashboard →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-10 border-t border-purple-100/50 mt-12 bg-white/50">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2 text-gray-500 text-xs sm:text-sm font-light text-center">
          <div className="flex items-center justify-center mb-2">
            <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-7 sm:h-8 md:h-10 w-auto object-contain transition-all duration-300" />
          </div>
          <div>© {new Date().getFullYear()} · Sistem Manajemen Surat</div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 font-medium">
            <Link to="/privacy-policy" className="hover:text-[#7A2D7C] transition">Kebijakan Privasi</Link>
            <span>•</span>
            <Link to="/terms-of-service" className="hover:text-[#7A2D7C] transition">Syarat & Ketentuan</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
