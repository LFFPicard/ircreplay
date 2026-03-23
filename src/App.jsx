import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { SessionProvider } from './context/SessionContext'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Viewer from './pages/Viewer'
import Stats from './pages/Stats'
import About from './pages/About'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <div className="flex flex-col h-screen overflow-hidden">
            <Nav />
            <main className="flex-1 overflow-hidden p-4">
              <Routes>
                <Route path="/" element={<Viewer />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App