/**
 * Firebase Authentication Service
 * Handles user authentication with Google Sign-In
 */

import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  connectAuthEmulator
} from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { firebaseConfig, validateFirebaseConfig, shouldUseEmulators, getEmulatorConfig } from './config'

// Initialize Firebase only if config is valid
let app: any = null
let auth: any = null
let emulatorConnected = false

if (validateFirebaseConfig()) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  
  // Connect to Auth Emulator if in development mode
  if (shouldUseEmulators()) {
    const emulatorConfig = getEmulatorConfig()
    if (emulatorConfig?.auth && !emulatorConnected) {
      try {
        // Safely check if emulator is already connected
        const isAlreadyConnected = auth?._delegate?._config?.emulator !== undefined
        
        if (!isAlreadyConnected) {
          connectAuthEmulator(auth, `http://${emulatorConfig.auth.host}`, { disableWarnings: true })
          emulatorConnected = true
          console.log('🔧 Connected to Firebase Auth Emulator:', emulatorConfig.auth.host)
        } else {
          emulatorConnected = true
          console.log('🔧 Firebase Auth Emulator already connected')
        }
      } catch (error) {
        console.warn('Failed to connect to Auth Emulator (may already be connected):', error)
        // Assume connected if error occurs (likely already connected)
        emulatorConnected = true
      }
    }
  }
} else {
  console.warn('Firebase not initialized - config is incomplete')
}

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  if (!auth) {
    throw new Error('Firebase not initialized. Please configure Firebase credentials.')
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    prompt: 'select_account'
  })

  try {
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }
  } catch (error: any) {
    console.error('Error signing in with Google:', error)
    throw new Error(error.message || 'Failed to sign in with Google')
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase not initialized')
  }

  try {
    await firebaseSignOut(auth)
  } catch (error: any) {
    console.error('Error signing out:', error)
    throw new Error(error.message || 'Failed to sign out')
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): AuthUser | null {
  if (!auth) return null
  
  const user = auth.currentUser
  if (!user) return null

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  if (!auth) {
    console.warn('Firebase not initialized, auth state listener not available')
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      })
    } else {
      callback(null)
    }
  })
}

/**
 * Get Firebase ID token for server verification
 */
export async function getIdToken(): Promise<string | null> {
  if (!auth || !auth.currentUser) {
    return null
  }

  try {
    return await auth.currentUser.getIdToken()
  } catch (error) {
    console.error('Error getting ID token:', error)
    return null
  }
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return auth !== null
}

