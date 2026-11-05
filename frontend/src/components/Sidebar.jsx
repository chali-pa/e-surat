import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LogoutConfirmDialog from './LogoutConfirmDialog'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)

  const location = useLocation()
  const navigate = useNavigate()

  // Listen for collapse/expand sidebar events
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

  // Close profile dropdown on click outside or escape
  useEffect(() => {
    if (!profileDropdownOpen) return

    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileDropdownOpen])

  // Navigation menu items
  const menuItems = [
    { 
      path: '/dashboard', 
      icon: 'bi-grid-1x2-fill', 
      label: 'Dashboard',
      isActive: (pathname, search) => pathname === '/dashboard' && !search.includes('view=scan')
    },
    { 
      path: '/dashboard?view=scan', 
      icon: 'bi-camera-fill', 
      label: 'Pindai Dokumen',
      isActive: (pathname, search) => pathname === '/dashboard' && search.includes('view=scan')
    },
    { 
      path: '/pdf-compressor', 
      icon: 'bi-file-zip', 
      label: 'Kompresor PDF',
      isActive: (pathname) => pathname === '/pdf-compressor'
    },
    { 
      path: '/profile', 
      icon: 'bi-person-fill', 
      label: 'Profil Pengguna',
      isActive: (pathname) => pathname === '/profile'
    },
  ]

  const handleLogout = () => {
    setProfileDropdownOpen(false)
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api.post('/api/logout')
    } catch (error) {
      console.error('Logout server call failed:', error)
    } finally {
      logout()
      setShowLogoutModal(false)
      navigate('/login', { replace: true })
    }
  }

  // Get user initials for fallback avatar
  const userName = user?.name || user?.googleName || 'Pengguna'
  const userEmail = user?.email || user?.googleEmail || ''
  const avatarUrl = user?.googlePicture || user?.google_picture || null

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[90] lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile top header bar */}
      <header className="lg:hidden sticky top-0 z-[95] bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 shadow-xs">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center transition"
          aria-label="Buka menu navigasi"
        >
          <i className="bi bi-list text-2xl"></i>
        </button>

        <Link to="/dashboard" className="flex items-center">
          <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 w-auto object-contain" />
        </Link>

        {/* User mini avatar on mobile header */}
        <Link
          to="/profile"
          className="w-9 h-9 rounded-full overflow-hidden border border-purple-200 bg-purple-50 flex items-center justify-center text-[#4B164C] font-bold text-xs"
          title="Buka Profil"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            getInitials(userName)
          )}
        </Link>
      </header>

      {/* Main Sidebar: Fixed drawer on mobile, sticky persistent column on desktop */}
      <aside
        id="sidebar"
        className={`
          fixed lg:sticky top-0 h-screen z-[100] bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'}
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          w-[270px] max-w-[85vw]
        `}
      >
        {/* Sidebar Brand Header */}
        <div className={`h-[72px] flex-shrink-0 flex items-center border-b border-gray-100 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center" onClick={() => setMobileOpen(false)}>
              <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 w-auto object-contain transition-all duration-300" />
            </Link>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition hidden lg:flex items-center justify-center"
          >
            <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'} text-lg`}></i>
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden flex items-center justify-center"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {menuItems.map((item) => {
            const active = item.isActive(location.pathname, location.search)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center rounded-xl transition min-h-[44px] group relative
                  ${collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'}
                  ${active
                    ? 'bg-purple-50 text-[#4B164C] font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }
                `}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                    active
                      ? 'bg-[#4B164C] text-white shadow-xs'
                      : 'text-slate-500 group-hover:text-[#4B164C]'
                  }`}
                >
                  <i className={`bi ${item.icon} text-base`}></i>
                </div>

                {!collapsed && (
                  <span className="ml-3 truncate text-xs flex-1">
                    {item.label}
                  </span>
                )}

                {/* Floating tooltip when collapsed */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[11px] font-semibold rounded-md opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-[110] shadow-md">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile & Quick Menu Footer */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0 relative" ref={profileDropdownRef}>
          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div
              className={`absolute bottom-full mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-[110] animate-fadeIn ${
                collapsed ? 'left-3 w-56' : 'left-3 right-3'
              }`}
            >
              <div className="p-2 border-b border-gray-100 mb-1">
                <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
                <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                {user?.google_connected && (
                  <span className="inline-flex items-center mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    Google Terhubung
                  </span>
                )}
              </div>

              <Link
                to="/profile"
                onClick={() => {
                  setProfileDropdownOpen(false)
                  setMobileOpen(false)
                }}
                className="flex items-center px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition"
              >
                <i className="bi bi-person mr-2.5 text-base text-slate-500"></i>
                Kelola Profil & Akun
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition text-left mt-0.5"
              >
                <i className="bi bi-box-arrow-right mr-2.5 text-base"></i>
                Keluar
              </button>
            </div>
          )}

          {/* Bottom Profile Bar Trigger */}
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title={collapsed ? userName : 'Buka menu profil'}
            className={`w-full flex items-center rounded-xl p-2 transition hover:bg-slate-50 text-left ${
              profileDropdownOpen ? 'bg-slate-100' : ''
            } ${collapsed ? 'justify-center' : 'justify-between'}`}
          >
            <div className="flex items-center min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-200 bg-gradient-to-tr from-[#4B164C] to-[#DD88CF] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  getInitials(userName)
                )}
              </div>

              {!collapsed && (
                <div className="ml-3 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {userName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {userEmail || 'Akun Aktif'}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <i className={`bi bi-chevron-${profileDropdownOpen ? 'down' : 'up'} text-xs text-slate-400 ml-2 flex-shrink-0`}></i>
            )}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        loading={isLoggingOut}
      />
    </>
  )
}
