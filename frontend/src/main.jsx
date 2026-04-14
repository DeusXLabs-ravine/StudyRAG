import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

// Suppress known R3F / Three.js teardown noise that can't be caught by error boundaries.
// These are internal frame-loop artifacts that fire as unhandled rejections during unmount.
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason ?? '');
  if (
    msg.includes('WebGL context') ||
    msg.includes('THREE.')
  ) {
    e.preventDefault(); // Stop it reaching the console as an error
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
