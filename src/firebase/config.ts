/**
 * Firebase Configuration
 * 
 * Configuration is loaded from environment variables (VITE_FIREBASE_*)
 * with fallback values for development. In production, ensure all
 * environment variables are set in your deployment platform.
 * 
 * Get these from: Firebase Console → Project Settings → General → Your apps
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBC8Xccg2a1jlp4yR-gh8b7sk9kNJsyTRI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mars-nexus.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mars-nexus",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mars-nexus.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "649504816384",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:649504816384:web:dbc0d02979bf317fc907e5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-PP17Q8XGPB"
}

/**
 * Check if we should use Firebase Emulators (development mode)
 */
export function shouldUseEmulators(): boolean {
  // Use emulators if:
  // 1. Explicitly enabled via env var
  // 2. Running in development mode (not production)
  // 3. Not explicitly disabled
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false'
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'
  return useEmulators && isDevelopment
}

/**
 * Get emulator connection settings
 */
export function getEmulatorConfig() {
  if (!shouldUseEmulators()) {
    return null
  }

  return {
    auth: {
      host: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099',
      protocol: 'http'
    },
    database: {
      host: import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_HOST || 'localhost:9000',
      protocol: 'http'
    },
    firestore: {
      host: import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || 'localhost:8080',
      protocol: 'http'
    },
    storage: {
      host: import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199',
      protocol: 'http'
    }
  }
}

// Validate that all config values are set
export function validateFirebaseConfig(): boolean {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
  const missing = required.filter(key => {
    const value = firebaseConfig[key as keyof typeof firebaseConfig]
    return !value || value.includes('your-') || value.includes('123456789')
  })
  
  if (missing.length > 0) {
    console.warn('Firebase config is incomplete. Missing or placeholder values for:', missing)
    return false
  }
  
  return true
}

