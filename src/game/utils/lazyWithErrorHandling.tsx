import { lazy, ComponentType } from 'react'
import { errorReporting } from './errorReporting'

/**
 * Wraps a lazy import with error handling for failed module loads
 * Provides better error messages when module files fail to load
 */
export function lazyWithErrorHandling<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
) {
  return lazy(async () => {
    try {
      return await importFn()
    } catch (error: any) {
      // Log detailed error information
      const errorMessage = error?.message || 'Unknown error'
      const errorStack = error?.stack || ''
      
      // Check if it's a module loading error
      const isModuleLoadError = 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Failed to load module') ||
        errorMessage.includes('text/html') ||
        errorMessage.includes('404') ||
        errorMessage.includes('MIME type')
      
      if (isModuleLoadError) {
        console.error(`[Module Load Error] Failed to load component "${componentName}":`, {
          error: errorMessage,
          component: componentName,
          suggestion: 'This may indicate a deployment issue. Try refreshing the page or clearing cache.',
          stack: errorStack
        })
        
        // Report to error reporting system
        errorReporting.reportCrash(
          `Module load failed: ${componentName}`,
          errorStack,
          {
            component: componentName,
            errorType: 'module_load_error',
            errorMessage: errorMessage,
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        )
      } else {
        console.error(`[Import Error] Failed to import component "${componentName}":`, error)
      }
      
      // Create a fallback component that shows an error message
      const FallbackComponent = () => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-400 mb-4">Component Load Error</h2>
            <p className="text-gray-300 mb-2">
              Failed to load <code className="text-cyan-400">{componentName}</code>
            </p>
            {isModuleLoadError && (
              <div className="text-yellow-400 text-sm mb-4 p-3 bg-yellow-900 bg-opacity-30 rounded">
                <p className="font-semibold mb-1">Possible causes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Deployment mismatch (old files cached)</li>
                  <li>Missing build artifacts</li>
                  <li>Network connectivity issues</li>
                </ul>
              </div>
            )}
            <p className="text-gray-400 text-sm mb-4">
              Please try refreshing the page. If the issue persists, clear your browser cache.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded mb-2"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                // Clear service worker cache if available
                if ('serviceWorker' in navigator && 'caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => caches.delete(name))
                  }).then(() => window.location.reload())
                } else {
                  window.location.reload()
                }
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Clear Cache & Reload
            </button>
          </div>
        </div>
      )
      
      FallbackComponent.displayName = `Fallback${componentName}`
      
      return {
        default: FallbackComponent as unknown as T
      }
    }
  })
}

