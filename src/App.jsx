import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { SessionProvider } from './context/SessionContext'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ClassicChrome from './components/ClassicChrome'
import Viewer from './pages/Viewer'
import Stats from './pages/Stats'
import About from './pages/About'
import Help from './pages/Help'
import Links from './pages/Links'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Viewer />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/about" element={<About />} />
      <Route path="/help" element={<Help />} />
      <Route path="/links" element={<Links />} />
    </Routes>
  )
}

function AppContent() {
  const { theme } = useTheme()
  const isClassic = theme === 'classic'

  if (isClassic) {
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
      <Nav />
      <main className="flex-1 overflow-hidden p-4">
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
          <AppContent />
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App