import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { analytics } from './game/utils/analytics'
import { onLCP, onINP, onCLS, type Metric } from 'web-vitals'

// Make analytics globally accessible
if (typeof window !== 'undefined') {
  (window as any).analytics = analytics
}

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

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  // Track LCP (Largest Contentful Paint)
  onLCP((metric: Metric) => {
    analytics.track('web_vital_lcp', { 
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      name: metric.name
    })
  })

  // Track INP (Interaction to Next Paint) - replaces FID in web-vitals v3+
  onINP((metric: Metric) => {
    analytics.track('web_vital_inp', { 
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      name: metric.name
    })
  })

  // Track CLS (Cumulative Layout Shift)
  onCLS((metric: Metric) => {
    analytics.track('web_vital_cls', { 
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      name: metric.name
    })
  })
}

// Handle HMR cleanup to prevent resource buildup during development
if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    // Clean up Three.js resources on HMR
    if (typeof window !== 'undefined') {
      try {
        // Clear Three.js cache
        import('three').then(({ Cache }) => {
          Cache.clear()
        }).catch(() => {
          // Ignore if three is not available
        })
        
        // Trigger memory cleanup
        import('./game/utils/memoryManager').then(({ memoryManager }) => {
          memoryManager.forceCleanup()
        }).catch(() => {
          // Ignore if memory manager is not available
        })
      } catch (error) {
        // Silently ignore cleanup errors during HMR
        if (import.meta.env.DEV) {
          console.warn('HMR cleanup error (non-critical):', error)
        }
      }
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

