import { Routes, Route, Navigate } from 'react-router-dom'
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
import SuratIndex from './pages/surat/SuratIndex'
import SuratCreate from './pages/surat/SuratCreate'
import SuratEdit from './pages/surat/SuratEdit'
import SuratKeluarIndex from './pages/surat-keluar/SuratKeluarIndex'
import SuratKeluarCreate from './pages/surat-keluar/SuratKeluarCreate'
import SuratKeluarEdit from './pages/surat-keluar/SuratKeluarEdit'

function App() {
  const isAuthenticated = !!localStorage.getItem('token')

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/surat" 
        element={isAuthenticated ? <Layout><SuratIndex /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/surat/create" 
        element={isAuthenticated ? <Layout><SuratCreate /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/surat/:id/edit" 
        element={isAuthenticated ? <Layout><SuratEdit /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/surat-keluar" 
        element={isAuthenticated ? <Layout><SuratKeluarIndex /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/surat-keluar/create" 
        element={isAuthenticated ? <Layout><SuratKeluarCreate /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/surat-keluar/:id/edit" 
        element={isAuthenticated ? <Layout><SuratKeluarEdit /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/profile" 
        element={isAuthenticated ? <Layout><Profile /></Layout> : <Navigate to="/login" replace />} 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
