/**
 * Error Handling Patterns - Centralized error handling utilities
 */

export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'GameError'
  }
}

export class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

export class DatabaseError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details)
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details)
    this.name = 'NetworkError'
  }
}

/**
 * Error handler wrapper for async functions
 */
export function handleAsyncError<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T> {
  return fn().catch((error) => {
    if (errorHandler) {
      errorHandler(error)
    } else {
      console.error('Unhandled async error:', error)
    }
    throw error
  })
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    console.warn('Failed to parse JSON:', error)
    return defaultValue
  }
}

/**
 * Safe number conversion
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

