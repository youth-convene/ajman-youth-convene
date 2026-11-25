import { createRoot } from 'react-dom/client'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './index.css'
import App from './App.jsx'

// StrictMode is intentionally omitted: its double-mount starts the camera twice
// on the attendance scanner.
createRoot(document.getElementById('root')).render(<App />)
