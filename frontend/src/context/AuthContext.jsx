import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user')
      return storedUser ? JSON.parse(storedUser) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUserStr = localStorage.getItem('user')
    let savedUser = null

    if (savedUserStr) {
      try {
        savedUser = JSON.parse(savedUserStr)
      } catch {
        savedUser = null
      }
    }

    if (savedToken) {
      setToken(savedToken)
      setUser(savedUser)
    } else {
      setToken(null)
      setUser(null)
    }
    setLoading(false)
  }, [])

  // Sync auth state across window events / localStorage changes
  useEffect(() => {
    const handleAuthSync = () => {
      const currentToken = localStorage.getItem('token')
      const currentUserStr = localStorage.getItem('user')
      let currentUser = null
      if (currentUserStr) {
        try {
          currentUser = JSON.parse(currentUserStr)
        } catch {
          currentUser = null
        }
      }
      setToken(currentToken || null)
      setUser(currentUser)
    }

    window.addEventListener('storage', handleAuthSync)
    window.addEventListener('auth-change', handleAuthSync)

    return () => {
      window.removeEventListener('storage', handleAuthSync)
      window.removeEventListener('auth-change', handleAuthSync)
    }
  }, [])

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken)
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
    }
    setToken(newToken)
    setUser(newUser || null)
    window.dispatchEvent(new Event('auth-change'))
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    window.dispatchEvent(new Event('auth-change'))
  }

  const value = {
    token,
    user,
    setUser,
    isAuthenticated: !!token,
    loading,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
