import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { SessionProvider } from './context/SessionContext'
import { UserProvider } from './context/UserContext'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ClassicChrome from './components/ClassicChrome'
import Viewer from './pages/Viewer'
import Stats from './pages/Stats'
import About from './pages/About'
import Help from './pages/Help'
import Links from './pages/Links'
import ComingSoon from './pages/ComingSoon'
import Pricing from './pages/Pricing'
import Dashboard from './pages/Dashboard'
import ShareView from './pages/ShareView'
import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'
import Terms   from './pages/Terms'
import Privacy from './pages/Privacy'
import Refunds from './pages/Refunds'

function ProtectedRoute({ children }) {
  const { userId, isLoaded } = useAuth()
  if (!isLoaded) return null
  if (!userId) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Viewer />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/about" element={<About />} />
      <Route path="/help" element={<Help />} />
      <Route path="/links" element={<Links />} />
      <Route path="/pro" element={<ComingSoon />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refunds" element={<Refunds />} />
    </Routes>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function AppContent() {
  const { theme, setTheme } = useTheme()
  const isMobile  = useIsMobile()
  const isClassic = theme === 'classic'

  useEffect(() => {
    if (isMobile && theme === 'classic') setTheme('dark')
  }, [isMobile, theme, setTheme])

  if (isClassic && !isMobile) {
    return (
      <div className="theme-classic">
        <ClassicChrome>
          <AppRoutes />
        </ClassicChrome>
      </div>
    )
  }

  return (
    <div className={`theme-${theme} flex flex-col h-screen overflow-hidden`}>
      <Nav isMobile={isMobile} />
      <main className="flex-1 overflow-hidden p-0 md:p-4">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <UserProvider>
            <Routes>
              <Route path="/s/:userId/:sessionId" element={<ShareView />} />
              <Route path="*" element={<AppContent />} />
            </Routes>
          </UserProvider>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App