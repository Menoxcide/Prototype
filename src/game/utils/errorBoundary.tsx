import { Component, ErrorInfo, ReactNode } from 'react'
import { errorReporting } from './errorReporting'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use centralized error handler
    const { handleError, ErrorType, ErrorSeverity } = require('./errorHandler')
    handleError(
      error,
      ErrorType.UNKNOWN,
      ErrorSeverity.HIGH,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    )
    
    // Also report to existing error reporting system
    errorReporting.reportCrash(
      error.message,
      error.stack,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    )
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-6 max-w-md w-full neon-border">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
            <p className="text-gray-300 mb-4">
              Something went wrong. Please refresh the page.
            </p>
            {this.state.error && (
              <details className="text-xs text-gray-500 mb-4">
                <summary>Error details</summary>
                <pre className="mt-2 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded"
            >
              Reload Game
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

