import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const location = useLocation()

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

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

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

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[90] lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile top header bar */}
      <header className="lg:hidden sticky top-0 z-[95] bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3 shadow-2xs">
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

        {/* Quick link to profile on mobile header */}
        <Link
          to="/profile"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:text-[#4B164C] hover:bg-purple-50 transition"
          title="Buka Profil Pengguna"
          aria-label="Buka Profil Pengguna"
        >
          <i className="bi bi-person text-lg"></i>
        </Link>
      </header>

      {/* Main Sidebar: Fixed drawer on mobile, sticky persistent column on desktop */}
      <aside
        id="sidebar"
        className={`
          fixed lg:sticky top-0 h-screen lg:h-[100dvh] min-h-[100dvh] z-[100] bg-white border-r border-slate-200
          flex flex-col m-0 rounded-none shadow-none
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'}
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          w-[270px] max-w-[85vw]
        `}
      >
        {/* Sidebar Brand Header */}
        <div className={`h-[68px] flex-shrink-0 flex items-center border-b border-slate-100 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center" onClick={() => setMobileOpen(false)}>
              <img src="/image/logo-esurat-light.svg" alt="E-Surat" className="h-9 w-auto object-contain transition-all duration-300" />
            </Link>
          )}

          {/* Desktop collapse/expand toggle button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition hidden lg:flex items-center justify-center"
          >
            <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'} text-lg`}></i>
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden flex items-center justify-center"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* Navigation Menu Links - fills the full remaining vertical space */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
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
                    ? 'bg-purple-50 text-[#4B164C] font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }
                `}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                    active
                      ? 'bg-[#4B164C] text-white shadow-2xs'
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
      </aside>
    </>
  )
}
