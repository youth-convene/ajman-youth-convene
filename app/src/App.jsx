import { lazy, Suspense } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Register from './pages/Register'
import { DEMO_MODE } from './lib/api'

// Only staff need the QR scanner library, so it loads on demand.
const Attendance = lazy(() => import('./pages/Attendance'))

export default function App() {
  return (
    <HashRouter>
      {DEMO_MODE && (
        <div className="demo-banner">
          Demo mode: no Google Sheet connected, so data is saved in this browser only. Set{' '}
          <code>VITE_API_URL</code> to go live.
        </div>
      )}
      <div className="shell">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Register />} />
            <Route
              path="/attendance"
              element={
                <Suspense fallback={<div className="card narrow loading"><span className="spinner" /></div>}>
                  <Attendance />
                </Suspense>
              }
            />
            <Route path="*" element={<Register />} />
          </Routes>
        </main>
        <footer className="footer">
          <span>RSC Ajman · Zone Youth Convene 2026</span>
          <nav>
            <Link to="/">Registration</Link>
            <Link to="/attendance">Attendance</Link>
          </nav>
        </footer>
      </div>
    </HashRouter>
  )
}
