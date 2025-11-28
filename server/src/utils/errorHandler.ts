/**
 * Server-Side Centralized Error Handling System
 * Provides consistent error handling, recovery strategies, and logging
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  GAME_LOGIC = 'GAME_LOGIC',
  SECURITY = 'SECURITY',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ServerError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: number
  recoverable: boolean
  recoveryStrategy?: RecoveryStrategy
  playerId?: string
  roomId?: string
}

export type RecoveryStrategy = () => Promise<void> | void

interface ErrorHandlerConfig {
  onError?: (error: ServerError) => void
  onRecovery?: (error: ServerError) => void
  enableLogging?: boolean
  enableReporting?: boolean
}

class ServerErrorHandler {
  private config: ErrorHandlerConfig
  private errorHistory: ServerError[] = []
  private maxHistorySize = 1000

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableLogging: true,
      enableReporting: false,
      ...config
    }
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  handleError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): ServerError {
    const message = typeof error === 'string' ? error : error.message
    const originalError = typeof error === 'string' ? undefined : error

    const serverError: ServerError = {
      type,
      severity,
      message,
      originalError,
      context,
      timestamp: Date.now(),
      recoverable: this.isRecoverable(type, severity),
      recoveryStrategy: this.getRecoveryStrategy(type, severity),
      playerId: context?.playerId,
      roomId: context?.roomId
    }

    // Log error
    if (this.config.enableLogging) {
      this.logError(serverError)
    }

    // Report error
    if (this.config.enableReporting) {
      this.reportError(serverError)
    }

    // Call custom handler
    if (this.config.onError) {
      this.config.onError(serverError)
    }

    // Add to history
    this.addToHistory(serverError)

    // Attempt recovery if recoverable
    if (serverError.recoverable && serverError.recoveryStrategy) {
      const result = serverError.recoveryStrategy()
      if (result && typeof result.catch === 'function') {
        result.catch((recoveryError: unknown) => {
          console.error('Recovery strategy failed:', recoveryError)
        })
      }
    }

    return serverError
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: Error, context?: Record<string, any>): ServerError {
    return this.handleError(
      error,
      ErrorType.NETWORK,
      ErrorSeverity.HIGH,
      { ...context, networkError: true }
    )
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: Error, context?: Record<string, any>): ServerError {
    return this.handleError(
      error,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.CRITICAL,
      { ...context, authError: true }
    )
  }

  /**
   * Handle validation errors
   */
  handleValidationError(error: Error | string, context?: Record<string, any>): ServerError {
    return this.handleError(
      error,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      { ...context, validationError: true }
    )
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error: Error, context?: Record<string, any>): ServerError {
    return this.handleError(
      error,
      ErrorType.DATABASE,
      ErrorSeverity.HIGH,
      { ...context, databaseError: true }
    )
  }

  /**
   * Handle game logic errors
   */
  handleGameLogicError(error: Error | string, context?: Record<string, any>): ServerError {
    return this.handleError(
      error,
      ErrorType.GAME_LOGIC,
      ErrorSeverity.MEDIUM,
      { ...context, gameLogicError: true }
    )
  }

  /**
   * Handle security errors
   */
  handleSecurityError(error: Error | string, context?: Record<string, any>): ServerError {
    return this.handleError(
      error,
      ErrorType.SECURITY,
      ErrorSeverity.CRITICAL,
      { ...context, securityError: true }
    )
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(type: ErrorType, severity: ErrorSeverity): boolean {
    // Critical errors are generally not recoverable
    if (severity === ErrorSeverity.CRITICAL) {
      return false
    }

    // Authentication and security errors are not recoverable automatically
    if (type === ErrorType.AUTHENTICATION || type === ErrorType.SECURITY) {
      return false
    }

    // Most other errors are recoverable
    return true
  }

  /**
   * Get recovery strategy for error type
   */
  private getRecoveryStrategy(type: ErrorType, severity: ErrorSeverity): RecoveryStrategy | undefined {
    switch (type) {
      case ErrorType.DATABASE:
        return async () => {
          // Attempt database reconnection
          // This would be implemented by the database service
          console.log('Attempting database reconnection...')
        }

      case ErrorType.NETWORK:
        return async () => {
          // Attempt to re-establish network connections
          console.log('Attempting network reconnection...')
        }

      case ErrorType.GAME_LOGIC:
        return async () => {
          // Reset game state to safe point
          console.log('Resetting game state...')
        }

      default:
        return undefined
    }
  }

  /**
   * Log error to console
   */
  private logError(error: ServerError): void {
    const logLevel = this.getLogLevel(error.severity)
    const logMessage = `[${error.type}] ${error.message}`
    const logData = {
      severity: error.severity,
      playerId: error.playerId,
      roomId: error.roomId,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    }

    switch (logLevel) {
      case 'error':
        console.error(logMessage, logData, error.originalError)
        break
      case 'warn':
        console.warn(logMessage, logData)
        break
      default:
        console.log(logMessage, logData)
    }
  }

  /**
   * Report error to external service
   */
  private reportError(error: ServerError): void {
    // Only report high/critical severity errors
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      // Error reporting integration: Supports Sentry if available
      // To enable Sentry on server, install @sentry/node and initialize:
      // import * as Sentry from '@sentry/node'
      // Sentry.init({ dsn: 'YOUR_DSN' })
      if (typeof process !== 'undefined' && (global as any).Sentry) {
        (global as any).Sentry.captureException(error.originalError || new Error(error.message), {
          tags: {
            errorType: error.type,
            severity: error.severity
          },
          extra: error.context
        })
      } else {
        // Fallback to console logging if no error reporting service is configured
        console.error('Critical error:', error)
      }
      // Additional error reporting services can be added here (Rollbar, LogRocket, etc.)
    }
  }

  /**
   * Get console log level based on severity
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'log' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      default:
        return 'log'
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(error: ServerError): void {
    this.errorHistory.push(error)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ServerError[] {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    byType: Record<ErrorType, number>
    bySeverity: Record<ErrorSeverity, number>
  } {
    const byType: Record<ErrorType, number> = {
      [ErrorType.NETWORK]: 0,
      [ErrorType.AUTHENTICATION]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.DATABASE]: 0,
      [ErrorType.GAME_LOGIC]: 0,
      [ErrorType.SECURITY]: 0,
      [ErrorType.UNKNOWN]: 0
    }

    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    }

    this.errorHistory.forEach(error => {
      byType[error.type]++
      bySeverity[error.severity]++
    })

    return {
      total: this.errorHistory.length,
      byType,
      bySeverity
    }
  }
}

// Export singleton instance
export const serverErrorHandler = new ServerErrorHandler({
  enableLogging: true,
  enableReporting: process.env.NODE_ENV === 'production'
})

// Export convenience functions
export function handleError(
  error: Error | string,
  type?: ErrorType,
  severity?: ErrorSeverity,
  context?: Record<string, any>
): ServerError {
  return serverErrorHandler.handleError(error, type, severity, context)
}

export function handleNetworkError(error: Error, context?: Record<string, any>): ServerError {
  return serverErrorHandler.handleNetworkError(error, context)
}

export function handleAuthError(error: Error, context?: Record<string, any>): ServerError {
  return serverErrorHandler.handleAuthError(error, context)
}

export function handleValidationError(error: Error | string, context?: Record<string, any>): ServerError {
  return serverErrorHandler.handleValidationError(error, context)
}

export function handleDatabaseError(error: Error, context?: Record<string, any>): ServerError {
  return serverErrorHandler.handleDatabaseError(error, context)
}

export function handleGameLogicError(error: Error | string, context?: Record<string, any>): ServerError {
  return serverErrorHandler.handleGameLogicError(error, context)
}

export function handleSecurityError(error: Error | string, context?: Record<string, any>): ServerError {
  return serverErrorHandler.handleSecurityError(error, context)
}
