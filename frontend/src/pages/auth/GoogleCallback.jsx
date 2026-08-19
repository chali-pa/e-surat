import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const handleGoogleCallback = () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')
      const success = searchParams.get('success')
      const loginMethod = searchParams.get('loginMethod') || 'google'

      if (error) {
        console.error('Google OAuth error:', error)
        navigate('/login', { state: { error: error } })
        return
      }

      if (!token) {
        console.error('No token received from Google OAuth')
        navigate('/login', { state: { error: 'Gagal mendapatkan token dari Google' } })
        return
      }

      try {
        // Decode token to get user info (basic JWT decode)
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        const user = JSON.parse(jsonPayload)

        const userObj = {
          id: user.id,
          name: user.name,
          email: user.email,
          loginMethod: loginMethod
        }
        
        login(token, userObj)

        // Redirect to dashboard
        navigate('/dashboard', { replace: true, state: { success: success || 'Google login successful' } })
      } catch (error) {
        console.error('Google callback error:', error)
        navigate('/login', { state: { error: 'Gagal memproses token Google' } })
      }
    }

    handleGoogleCallback()
  }, [searchParams, navigate, login])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0015' }}>
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Memproses Google OAuth...</p>
      </div>
    </div>
  )
}
