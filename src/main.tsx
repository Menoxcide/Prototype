import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Workaround for React DevTools compatibility with React 19
// This error occurs when DevTools tries to parse React version but gets empty string
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Override console.error to filter out the DevTools semver error
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const errorMessage = args[0]?.message || args[0]?.toString() || ''
    if (errorMessage.includes('Invalid argument not valid semver')) {
      // Silently ignore - this is a known React 19 + DevTools compatibility issue
      return
    }
    originalConsoleError.apply(console, args)
  }
  
  // Also catch via error event listener (backup)
  const errorHandler = (event: ErrorEvent) => {
    if (event.message?.includes?.('Invalid argument not valid semver')) {
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  }
  window.addEventListener('error', errorHandler, true)
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    console.error = originalConsoleError
    window.removeEventListener('error', errorHandler, true)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

