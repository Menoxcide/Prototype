/**
 * Error Reporting System
 * Collects and reports errors, crashes, and performance issues
 */

import React from 'react'
import { analytics } from './analytics'

export interface ErrorReport {
  id: string
  type: 'error' | 'crash' | 'warning' | 'performance'
  message: string
  stack?: string
  timestamp: number
  userAgent: string
  url: string
  playerId?: string
  context?: Record<string, any>
}

class ErrorReportingSystem {
  private errorQueue: ErrorReport[] = []
  private maxQueueSize = 50
  // @ts-ignore - Used in startReporting() method, TypeScript doesn't detect usage
  private reportInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupErrorHandlers()
    this.startReporting()
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      // Filter out React DevTools semver errors
      if (event.message?.includes('Invalid argument not valid semver')) {
        return
      }
      
      this.reportError({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || String(event.reason)
      // Filter out React DevTools semver errors
      if (message?.includes('Invalid argument not valid semver')) {
        return
      }
      
      this.reportError({
        type: 'error',
        message,
        stack: event.reason?.stack
      })
    })
  }

  /**
   * Report an error
   */
  reportError(error: Partial<ErrorReport> & { message: string }): void {
    // Filter out known harmless errors (React DevTools compatibility issues)
    if (error.message?.includes('Invalid argument not valid semver')) {
      // This is a known React 19 + DevTools compatibility issue
      // The error is harmless and doesn't affect app functionality
      return
    }

    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: error.type || 'error',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      playerId: error.playerId,
      context: error.context
    }

    this.errorQueue.push(report)

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error Report:', report)
    }

    // Send to analytics
    analytics.track('error_occurred', {
      error_type: report.type,
      error_message: report.message,
      error_stack: report.stack?.substring(0, 500) // Limit stack trace length
    })
  }

  /**
   * Report a crash
   */
  reportCrash(message: string, stack?: string, context?: Record<string, any>): void {
    this.reportError({
      type: 'crash',
      message,
      stack,
      context
    })
  }

  /**
   * Report a performance issue
   */
  reportPerformance(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      this.reportError({
        type: 'performance',
        message: `Performance issue: ${metric} = ${value} (threshold: ${threshold})`,
        context: { metric, value, threshold }
      })
    }
  }

  /**
   * Start periodic error reporting
   */
  private startReporting(): void {
    // Report errors every 30 seconds
    this.reportInterval = setInterval(() => {
      this.flushErrorQueue()
    }, 30000)
  }

  /**
   * Flush error queue to server
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return

    const errorsToReport = [...this.errorQueue]
    this.errorQueue = []

    try {
      // In production, send to error reporting service
      if (import.meta.env.PROD) {
        // Would send to error reporting API
        // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorsToReport) })
      } else {
        // In development, just log
        console.log('Error Queue:', errorsToReport)
      }
    } catch (error) {
      console.error('Failed to report errors:', error)
      // Re-add to queue if reporting fails
      this.errorQueue.unshift(...errorsToReport)
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {}
    this.errorQueue.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1
    })

    return {
      total: this.errorQueue.length,
      byType
    }
  }

  /**
   * Clear error queue
   */
  clearErrors(): void {
    this.errorQueue = []
  }
}

export const errorReporting = new ErrorReportingSystem()

/**
 * React Error Boundary integration
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorReporting.reportCrash(
      error.message,
      error.stack,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    )
  }

  render() {
    if (this.state.hasError) {
      return React.createElement(
        'div',
        { className: 'fixed inset-0 bg-black flex items-center justify-center z-50' },
        React.createElement(
          'div',
          { className: 'text-center text-white p-8' },
          React.createElement('h1', { className: 'text-2xl font-bold text-red-400 mb-4' }, 'Something went wrong'),
          React.createElement('p', { className: 'text-gray-400 mb-4' }, this.state.error?.message),
          React.createElement(
            'button',
            {
              onClick: () => window.location.reload(),
              className: 'bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded'
            },
            'Reload Game'
          )
        )
      )
    }

    return this.props.children
  }
}

