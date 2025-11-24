/**
 * Login Screen Component
 * Handles Firebase authentication with Google Sign-In
 */

import { useState, useEffect } from 'react'
import { signInWithGoogle, onAuthStateChange, AuthUser, isFirebaseInitialized } from '../../firebase/auth'
import { getRedirectResult } from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { shouldUseEmulators } from '../../firebase/config'

interface LoginScreenProps {
  onAuthSuccess: (user: AuthUser) => void
}

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Check if Firebase is initialized
    if (!isFirebaseInitialized()) {
      setError('Firebase authentication is not configured. Please set up Firebase credentials.')
      setInitializing(false)
      return
    }

    let unsubscribe: (() => void) | null = null

    // If using emulator, check for redirect result first
    const checkRedirectResult = async () => {
      if (shouldUseEmulators()) {
        try {
          const auth = getAuth()
          const redirectResult = await getRedirectResult(auth)
          if (redirectResult?.user) {
            const user: AuthUser = {
              uid: redirectResult.user.uid,
              email: redirectResult.user.email,
              displayName: redirectResult.user.displayName,
              photoURL: redirectResult.user.photoURL
            }
            setInitializing(false)
            onAuthSuccess(user)
            return true // Indicate we handled redirect
          }
        } catch (error: any) {
          console.error('Error checking redirect result:', error)
          // Continue to normal auth state check
        }
      }
      return false
    }

    // Check redirect result, then set up auth state listener
    checkRedirectResult().then((handledRedirect) => {
      if (!handledRedirect) {
        // Check if user is already authenticated
        unsubscribe = onAuthStateChange((user) => {
          setInitializing(false)
          if (user) {
            onAuthSuccess(user)
          }
        })
      }
    }).catch(() => {
      // If redirect check fails, still set up auth state listener
      unsubscribe = onAuthStateChange((user) => {
        setInitializing(false)
        if (user) {
          onAuthSuccess(user)
        }
      })
    })

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [onAuthSuccess])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const user = await signInWithGoogle()
      onAuthSuccess(user)
    } catch (err: any) {
      // If using emulator and redirecting, the error message is expected
      if (shouldUseEmulators() && err.message?.includes('Redirecting')) {
        // Don't show error - redirect is happening
        setLoading(true) // Keep loading state during redirect
        return
      }
      setError(err.message || 'Failed to sign in. Please try again.')
      console.error('Login error:', err)
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-cyan-400 neon-glow mb-4">
            NEX://VOID
          </h1>
          <p className="text-cyan-300">Initializing...</p>
        </div>
      </div>
    )
  }

  if (!isFirebaseInitialized()) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-6 max-w-md w-full neon-border">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h1>
          <p className="text-gray-300 mb-4">
            Firebase authentication is not configured. Please set up your Firebase credentials in the environment variables.
          </p>
          <p className="text-sm text-gray-500">
            See src/firebase/config.ts for configuration details.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-8 max-w-md w-full neon-border">
        <h1 className="text-4xl font-bold text-cyan-400 neon-glow mb-2 text-center">
          NEX://VOID
        </h1>
        <p className="text-cyan-300 text-center mb-8">Mobile Cyberpunk MMO</p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

