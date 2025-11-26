/**
 * Centralized Error Handling System
 * Provides consistent error handling, recovery strategies, and user-friendly messages
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  RESOURCE = 'RESOURCE',
  GAME_LOGIC = 'GAME_LOGIC',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface GameError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: number
  recoverable: boolean
  recoveryStrategy?: RecoveryStrategy
}

export type RecoveryStrategy = () => Promise<void> | void

interface ErrorHandlerConfig {
  onError?: (error: GameError) => void
  onRecovery?: (error: GameError) => void
  enableLogging?: boolean
  enableReporting?: boolean
}

class ErrorHandler {
  private config: ErrorHandlerConfig
  private errorHistory: GameError[] = []
  private maxHistorySize = 100

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
  ): GameError {
    const message = typeof error === 'string' ? error : error.message
    const originalError = typeof error === 'string' ? undefined : error

    const gameError: GameError = {
      type,
      severity,
      message,
      userMessage: this.getUserFriendlyMessage(type, message),
      originalError,
      context,
      timestamp: Date.now(),
      recoverable: this.isRecoverable(type, severity),
      recoveryStrategy: this.getRecoveryStrategy(type, severity)
    }

    // Log error
    if (this.config.enableLogging) {
      this.logError(gameError)
    }

    // Report error
    if (this.config.enableReporting) {
      this.reportError(gameError)
    }

    // Call custom handler
    if (this.config.onError) {
      this.config.onError(gameError)
    }

    // Add to history
    this.addToHistory(gameError)

    // Attempt recovery if recoverable
    if (gameError.recoverable && gameError.recoveryStrategy) {
      try {
        gameError.recoveryStrategy()
        if (this.config.onRecovery) {
          this.config.onRecovery(gameError)
        }
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError)
      }
    }

    return gameError
  }

  /**
   * Handle network errors with reconnection logic
   */
  handleNetworkError(error: Error, context?: Record<string, any>): GameError {
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
  handleAuthError(error: Error, context?: Record<string, any>): GameError {
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
  handleValidationError(error: Error | string, context?: Record<string, any>): GameError {
    return this.handleError(
      error,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      { ...context, validationError: true }
    )
  }

  /**
   * Handle resource loading errors
   */
  handleResourceError(error: Error, context?: Record<string, any>): GameError {
    return this.handleError(
      error,
      ErrorType.RESOURCE,
      ErrorSeverity.MEDIUM,
      { ...context, resourceError: true }
    )
  }

  /**
   * Handle game logic errors
   */
  handleGameLogicError(error: Error | string, context?: Record<string, any>): GameError {
    return this.handleError(
      error,
      ErrorType.GAME_LOGIC,
      ErrorSeverity.MEDIUM,
      { ...context, gameLogicError: true }
    )
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(type: ErrorType, _message: string): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Connection issue detected. Attempting to reconnect...',
      [ErrorType.AUTHENTICATION]: 'Authentication failed. Please log in again.',
      [ErrorType.VALIDATION]: 'Invalid input. Please check your input and try again.',
      [ErrorType.RESOURCE]: 'Failed to load resource. The game may continue with reduced quality.',
      [ErrorType.GAME_LOGIC]: 'An unexpected error occurred. The game will attempt to recover.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    }

    return messages[type] || messages[ErrorType.UNKNOWN]
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(type: ErrorType, severity: ErrorSeverity): boolean {
    // Critical errors are generally not recoverable
    if (severity === ErrorSeverity.CRITICAL) {
      return false
    }

    // Authentication errors are not recoverable automatically
    if (type === ErrorType.AUTHENTICATION) {
      return false
    }

    // Most other errors are recoverable
    return true
  }

  /**
   * Get recovery strategy for error type
   */
  private getRecoveryStrategy(type: ErrorType, _severity: ErrorSeverity): RecoveryStrategy | undefined {
    switch (type) {
      case ErrorType.NETWORK:
        return () => {
          // Attempt to reconnect
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('network-reconnect')
            window.dispatchEvent(event)
          }
        }

      case ErrorType.RESOURCE:
        return () => {
          // Trigger resource reload
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('resource-reload')
            window.dispatchEvent(event)
          }
        }

      case ErrorType.GAME_LOGIC:
        return () => {
          // Reset game state to safe point
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('game-reset')
            window.dispatchEvent(event)
          }
        }

      default:
        return undefined
    }
  }

  /**
   * Log error to console
   */
  private logError(error: GameError): void {
    const logLevel = this.getLogLevel(error.severity)
    const logMessage = `[${error.type}] ${error.message}`
    const logData = {
      severity: error.severity,
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
   * Report error to external service (e.g., Sentry)
   */
  private reportError(error: GameError): void {
    // Only report high/critical severity errors
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      // TODO: Integrate with error reporting service (Sentry, Rollbar, etc.)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error.originalError || new Error(error.message), {
          tags: {
            errorType: error.type,
            severity: error.severity
          },
          extra: error.context
        })
      }
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
  private addToHistory(error: GameError): void {
    this.errorHistory.push(error)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): GameError[] {
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
      [ErrorType.RESOURCE]: 0,
      [ErrorType.GAME_LOGIC]: 0,
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
export const errorHandler = new ErrorHandler({
  enableLogging: true,
  enableReporting: import.meta.env.PROD // Only report in production
})

// Export convenience functions
export function handleError(
  error: Error | string,
  type?: ErrorType,
  severity?: ErrorSeverity,
  context?: Record<string, any>
): GameError {
  return errorHandler.handleError(error, type, severity, context)
}

export function handleNetworkError(error: Error, context?: Record<string, any>): GameError {
  return errorHandler.handleNetworkError(error, context)
}

export function handleAuthError(error: Error, context?: Record<string, any>): GameError {
  return errorHandler.handleAuthError(error, context)
}

export function handleValidationError(error: Error | string, context?: Record<string, any>): GameError {
  return errorHandler.handleValidationError(error, context)
}

export function handleResourceError(error: Error, context?: Record<string, any>): GameError {
  return errorHandler.handleResourceError(error, context)
}

export function handleGameLogicError(error: Error | string, context?: Record<string, any>): GameError {
  return errorHandler.handleGameLogicError(error, context)
}

