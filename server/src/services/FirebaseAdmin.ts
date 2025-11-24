/**
 * Firebase Admin SDK Service
 * Handles server-side Firebase authentication token verification
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let adminApp: App | null = null
let adminAuth: Auth | null = null

/**
 * Check if we should use Firebase Emulators (development mode)
 */
function shouldUseEmulators(): boolean {
  // Use emulators if:
  // 1. Explicitly enabled via env var
  // 2. Running in development mode (NODE_ENV !== 'production')
  // 3. Not explicitly disabled
  const useEmulators = process.env.USE_FIREBASE_EMULATORS !== 'false'
  const isDevelopment = process.env.NODE_ENV !== 'production'
  return useEmulators && isDevelopment
}

/**
 * Get emulator connection settings
 */
function getEmulatorConfig() {
  if (!shouldUseEmulators()) {
    return null
  }

  return {
    auth: {
      host: process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099'
    },
    database: {
      host: process.env.FIREBASE_DATABASE_EMULATOR_HOST || 'localhost:9000'
    },
    firestore: {
      host: process.env.FIREBASE_FIRESTORE_EMULATOR_HOST || 'localhost:8080'
    },
    storage: {
      host: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199'
    }
  }
}

/**
 * Initialize Firebase Admin SDK
 * Looks for service account key file or uses environment variables
 */
export function initializeFirebaseAdmin(): boolean {
  if (adminApp) {
    return true // Already initialized
  }

  try {
    // Try to load from service account file first
    // Check multiple possible locations
    const possiblePaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.join(process.cwd(), 'firebase-service-account.json'), // Server directory
      path.join(process.cwd(), '..', 'firebase-service-account.json'), // Project root
      path.join(__dirname, '..', '..', 'firebase-service-account.json') // Relative to this file
    ].filter(Boolean) as string[]
    
    let serviceAccountPath: string | null = null
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        serviceAccountPath = possiblePath
        break
      }
    }

    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      })
      console.log(`Firebase Admin initialized from service account file: ${serviceAccountPath}`)
    } else if (process.env.FIREBASE_ADMIN_PROJECT_ID) {
      // Use environment variables
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL

      if (!privateKey || !clientEmail) {
        console.warn('Firebase Admin: Missing FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_ADMIN_CLIENT_EMAIL')
        return false
      }

      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail,
          privateKey
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
      })
      console.log('Firebase Admin initialized from environment variables')
    } else {
      console.warn('Firebase Admin not initialized: No service account file or environment variables found')
      console.warn('Checked paths:')
      possiblePaths.forEach(p => console.warn(`  - ${p}`))
      console.warn('')
      console.warn('To fix this:')
      console.warn('  1. Go to: https://console.firebase.google.com/project/nex-void/settings/serviceaccounts/adminsdk')
      console.warn('  2. Click "Generate new private key"')
      console.warn('  3. Save as: server/firebase-service-account.json')
      console.warn('  OR set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_ADMIN_* environment variables')
      return false
    }

    adminAuth = getAuth(adminApp)
    
    // Connect to Auth Emulator if in development mode
    if (shouldUseEmulators()) {
      const emulatorConfig = getEmulatorConfig()
      if (emulatorConfig?.auth) {
        // Set environment variable for Firebase Admin SDK to use emulator
        process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorConfig.auth.host
        console.log('🔧 Firebase Admin configured to use Auth Emulator:', emulatorConfig.auth.host)
      }
    }
    
    return true
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    return false
  }
}

/**
 * Verify Firebase ID token from client
 * Returns the decoded token with user UID if valid
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!adminAuth) {
    console.error('Firebase Admin not initialized. Cannot verify token.')
    return null
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email
    }
  } catch (error: any) {
    console.error('Token verification failed:', error.message)
    return null
  }
}

/**
 * Get user data by UID
 */
export async function getUserByUid(uid: string): Promise<{ uid: string; email?: string; displayName?: string } | null> {
  if (!adminAuth) {
    console.error('Firebase Admin not initialized')
    return null
  }

  try {
    const userRecord = await adminAuth.getUser(uid)
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName
    }
  } catch (error: any) {
    console.error('Failed to get user:', error.message)
    return null
  }
}

/**
 * Check if Firebase Admin is initialized
 */
export function isFirebaseAdminInitialized(): boolean {
  return adminApp !== null && adminAuth !== null
}

