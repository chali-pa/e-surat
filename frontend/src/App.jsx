import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import GoogleCallback from './pages/auth/GoogleCallback'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Layout from './components/Layout'
import PdfCompressorPage from './pages/pdf-compressor/PdfCompressorPage'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0015]">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-sm font-medium tracking-wide">Memuat...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public-only routes (redirect authenticated users to /dashboard) */}
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <Landing />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />

      {/* OAuth Callback route */}
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {/* Always accessible static legal pages */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />

      {/* Protected routes (accessible only when authenticated) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Redirects from old routes to consolidated Dashboard */}
      <Route path="/surat" element={<Navigate to="/dashboard?type=incoming" replace />} />
      <Route path="/surat/create" element={<Navigate to="/dashboard?type=incoming" replace />} />
      <Route path="/surat/:id/edit" element={<Navigate to="/dashboard?type=incoming" replace />} />
      <Route path="/surat-keluar" element={<Navigate to="/dashboard?type=outgoing" replace />} />
      <Route path="/surat-keluar/create" element={<Navigate to="/dashboard?type=outgoing" replace />} />
      <Route path="/surat-keluar/:id/edit" element={<Navigate to="/dashboard?type=outgoing" replace />} />
      <Route path="/mail-management" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/pdf-compressor"
        element={
          <ProtectedRoute>
            <PdfCompressorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
