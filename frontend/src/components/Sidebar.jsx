import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LogoutConfirmDialog from './LogoutConfirmDialog'

export default function Sidebar() {
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

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
    { path: '/pdf-compressor', icon: 'bi-file-zip', label: 'Kompresor PDF' },
    { path: '/profile', icon: 'bi-person-fill', label: 'Profil' },
  ]

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api.post('/api/logout')
    } catch (error) {
      // Non-fatal: proceed with client-side cleanup even if server call fails
      console.error('Logout server call failed:', error)
    } finally {
      logout()
      setShowLogoutModal(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      {/* Mobile overlay — sits above content (z-[90]) but below the drawer (z-[100]) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile header — z-[95] keeps it above the overlay so it's always tappable */}
      <header className="lg:hidden sticky top-0 z-[95] bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
        {/* Hamburger — min 44×44 touch target */}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-3 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Buka menu navigasi"
        >
          <i className="bi bi-list text-2xl"></i>
        </button>
        <Link to="/dashboard" className="flex items-center">
          <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 sm:h-10 w-auto object-contain" />
        </Link>
        {/* Spacer keeps logo centred */}
        <span className="min-w-[44px]" aria-hidden="true" />
      </header>

      {/* Sidebar drawer — z-[100] sits above overlay and mobile header */}
      <aside
        id="sidebar"
        className={`
          fixed lg:sticky top-0 h-screen z-[100] bg-white border-r border-gray-100 shadow-sm
          flex flex-col
          transition-transform duration-300
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-[260px]
        `}
      >
        {/* Sidebar header */}
        <div className={`h-[76px] flex-shrink-0 flex items-center border-b border-gray-100 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition hidden lg:flex items-center justify-center"
          >
            <i className="bi bi-list text-2xl"></i>
          </button>
          {!collapsed && (
            <Link to="/dashboard" className="ml-2 flex items-center sidebar-logo" onClick={() => setMobileOpen(false)}>
              <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 sm:h-10 w-auto object-contain transition-all duration-300" />
            </Link>
          )}
        </div>

        {/* Nav — overflow-y-auto so it scrolls if items ever exceed screen height */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center p-3 rounded-xl transition min-h-[44px]
                ${collapsed ? 'justify-center' : 'px-4'}
                ${location.pathname === item.path
                  ? 'bg-purple-50 text-[#4B164C] font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
                }
              `}
            >
              <i className={`bi ${item.icon} text-lg flex-shrink-0`}></i>
              {!collapsed && <span className="ml-4 menu-text font-medium text-sm">{item.label}</span>}
            </Link>
          ))}

          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              onClick={handleLogout}
              aria-label="Keluar"
              title={collapsed ? 'Keluar' : undefined}
              className={`
                w-full flex items-center p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition min-h-[44px]
                ${collapsed ? 'justify-center' : 'px-4'}
              `}
            >
              <i className="bi bi-box-arrow-right text-lg flex-shrink-0"></i>
              {!collapsed && <span className="ml-4 menu-text font-medium text-sm">Keluar</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Logout Confirmation — independent from account-deletion logic */}
      <LogoutConfirmDialog
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        loading={isLoggingOut}
      />
    </>
  )
}
