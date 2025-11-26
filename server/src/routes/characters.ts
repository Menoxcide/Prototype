/**
 * Character Management API Routes
 * Provides endpoints for listing and managing characters
 */

import { Router, Request, Response } from 'express'
import { PlayerDataRepository } from '../services/PlayerDataRepository'
import { DatabaseService } from '../services/DatabaseService'

// Maximum characters per account (configurable)
const MAX_CHARACTERS_PER_USER = parseInt(process.env.MAX_CHARACTERS_PER_USER || '5', 10)

export function createCharactersRouter(db: DatabaseService): Router {
  const router = Router()
  const playerRepository = new PlayerDataRepository(db)

  /**
   * Middleware to verify Firebase token
   * In a production app, you'd extract this to a separate middleware file
   */
  async function verifyAuthToken(req: Request, res: Response, next: () => void) {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Missing or invalid authorization header'
        })
      }

      const token = authHeader.substring(7)
      
      // Initialize Firebase Admin and verify token
      const { initializeFirebaseAdmin, verifyIdToken } = await import('../services/FirebaseAdmin')
      const isInitialized = initializeFirebaseAdmin()
      
      if (!isInitialized) {
        // If Firebase isn't configured, allow requests (for development)
        console.warn('Firebase Admin not initialized - allowing unauthenticated request')
        // For development, we'll accept a userId in the header
        const devUserId = req.headers['x-user-id'] as string
        if (devUserId) {
          (req as any).userId = devUserId
          return next()
        }
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Verify the token using the FirebaseAdmin service
      const decodedToken = await verifyIdToken(token)
      if (!decodedToken) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        })
      }

      // Set userId from decoded token
      ;(req as any).userId = decodedToken.uid
      next()
    } catch (error) {
      console.error('Auth verification error:', error)
      return res.status(500).json({
        success: false,
        error: 'Authentication verification failed'
      })
    }
  }

  /**
   * GET /api/characters
   * List all characters for the authenticated user
   */
  router.get('/', verifyAuthToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string
      const characters = await playerRepository.listCharactersByUser(userId)

      res.json({
        success: true,
        characters
      })
    } catch (error) {
      console.error('Error listing characters:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list characters'
      })
    }
  })

  /**
   * GET /api/characters/count
   * Get the number of characters for the authenticated user
   */
  router.get('/count', verifyAuthToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string
      const count = await playerRepository.countCharactersByUser(userId)

      res.json({
        success: true,
        count,
        maxCharacters: MAX_CHARACTERS_PER_USER,
        canCreateMore: count < MAX_CHARACTERS_PER_USER
      })
    } catch (error) {
      console.error('Error counting characters:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to count characters'
      })
    }
  })

  /**
   * GET /api/characters/:characterId
   * Get a specific character by ID (if owned by the user)
   */
  router.get('/:characterId', verifyAuthToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string
      const { characterId } = req.params

      const character = await playerRepository.loadPlayerData(characterId)
      
      if (!character) {
        return res.status(404).json({
          success: false,
          error: 'Character not found'
        })
      }

      // Verify ownership
      if (character.userId && character.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // For backwards compatibility, if no userId is set and character id matches userId, allow it
      if (!character.userId && character.id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      res.json({
        success: true,
        character
      })
    } catch (error) {
      console.error('Error loading character:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load character'
      })
    }
  })

  return router
}

export { MAX_CHARACTERS_PER_USER }

