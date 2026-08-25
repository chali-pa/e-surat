import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutMethod, setLogoutMethod] = useState('password') // 'password' or 'google'
  const [verificationInput, setVerificationInput] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Detect login method from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    // If user has a google flag or no password, assume Google login
    if (user.loginMethod === 'google' || (user.name && !user.email?.includes('@'))) {
      setLogoutMethod('google')
    } else {
      setLogoutMethod('password')
    }
  }, [])

  // Listen for collapse sidebar event
  useEffect(() => {
    const handleCollapse = () => setCollapsed(true)
    const handleExpand = () => setCollapsed(false)
    
    window.addEventListener('collapseSidebar', handleCollapse)
    window.addEventListener('expandSidebar', handleExpand)
    
    return () => {
      window.removeEventListener('collapseSidebar', handleCollapse)
      window.removeEventListener('expandSidebar', handleExpand)
    }
  }, [])

  const menuItems = [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
    { path: '/mail-management', icon: 'bi-mailbox', label: 'Kelola Surat' },
    { path: '/surat', icon: 'bi-envelope-fill', label: 'Surat Masuk' },
    { path: '/surat-keluar', icon: 'bi-send-fill', label: 'Surat Keluar' },
    { path: '/profile', icon: 'bi-person-fill', label: 'Profil' },
  ]

  const handleLogout = () => {
    setShowLogoutModal(true)
    setVerificationInput('')
    setVerificationError('')
    setIsVerifying(false)
  }

  const confirmLogout = async () => {
    setIsVerifying(true)
    setVerificationError('')
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      if (logoutMethod === 'password') {
        // Verify password with backend
        try {
          const response = await api.post('/api/verify-password', { 
            email: user.email,
            password: verificationInput 
          })
          if (!response.data.success) {
            setVerificationError('Password yang Anda masukkan salah')
            setIsVerifying(false)
            return
          }
        } catch (error) {
          setVerificationError('Password yang Anda masukkan salah')
          setIsVerifying(false)
          return
        }
      } else {
        // Verify Google account name
        if (verificationInput.toLowerCase() !== user.name?.toLowerCase()) {
          setVerificationError('Nama akun Google yang Anda masukkan salah')
          setIsVerifying(false)
          return
        }
      }

      // Verification passed, proceed with logout
      try {
        await api.post('/api/logout')
      } catch (error) {
        console.error('Logout failed:', error)
      } finally {
        logout()
        setShowLogoutModal(false)
        navigate('/login', { replace: true })
      }
    } catch (error) {
      setVerificationError('Terjadi kesalahan saat verifikasi')
      setIsVerifying(false)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-90 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-[80] bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
        <button 
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
        >
          <i className="bi bi-list text-2xl"></i>
        </button>
        <Link to="/dashboard" className="flex items-center">
          <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 sm:h-10 md:h-11 w-auto object-contain transition-all duration-300" />
        </Link>
        <span className="w-9"></span>
      </header>

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`
          fixed lg:sticky top-0 h-screen z-100 bg-white border-r border-gray-100 shadow-sm
          transition-all duration-300
          ${collapsed ? 'lg:!w-[72px]' : 'lg:w-[260px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-[260px]
        `}
      >
        <div className={`h-[76px] flex items-center border-b border-gray-100 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition hidden lg:block"
          >
            <i className="bi bi-list text-2xl"></i>
          </button>
          {!collapsed && (
            <Link to="/dashboard" className="ml-2 flex items-center sidebar-logo">
              <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 sm:h-10 md:h-11 w-auto object-contain transition-all duration-300" />
            </Link>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2 mt-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center p-3 rounded-xl transition
                ${collapsed ? 'justify-center' : 'px-4'}
                ${location.pathname === item.path 
                  ? 'bg-purple-50 text-[#4B164C] font-medium' 
                  : 'text-slate-600 hover:bg-slate-100'
                }
              `}
            >
              <i className={`bi ${item.icon} text-lg`}></i>
              {!collapsed && <span className="ml-4 menu-text font-medium text-sm">{item.label}</span>}
            </Link>
          ))}

          <div className="mt-4 border-t border-gray-100 pt-4">
            <button 
              onClick={handleLogout}
              aria-label="Keluar"
              title={collapsed ? "Keluar" : undefined}
              className={`
                w-full flex items-center p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition
                ${collapsed ? 'justify-center' : 'px-4'}
              `}
            >
              <i className="bi bi-box-arrow-right text-lg"></i>
              {!collapsed && <span className="ml-4 menu-text font-medium text-sm">Keluar</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mx-auto mb-4">
              <i className="bi bi-box-arrow-right text-2xl text-red-600"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Keluar?</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              {logoutMethod === 'password' 
                ? 'Masukkan password Anda untuk konfirmasi logout.' 
                : 'Masukkan nama akun Google Anda untuk konfirmasi logout.'}
            </p>
            
            {/* Verification Input */}
            <div className="mb-4">
              <input
                type={logoutMethod === 'password' ? 'password' : 'text'}
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                placeholder={logoutMethod === 'password' ? 'Password' : 'Nama akun Google'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                disabled={isVerifying}
              />
              {verificationError && (
                <p className="text-red-500 text-xs mt-2">{verificationError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isVerifying}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                disabled={isVerifying || !verificationInput}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 transition disabled:opacity-50"
              >
                {isVerifying ? 'Memverifikasi...' : 'Ya, Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
