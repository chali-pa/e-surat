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

      {/* Logout Confirmation — uses independent LogoutConfirmDialog, no shared logic with account deletion */}
      <LogoutConfirmDialog
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        loading={isLoggingOut}
      />
    </>
  )
}
