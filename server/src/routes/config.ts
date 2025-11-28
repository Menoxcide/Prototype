/**
 * Server Configuration API Routes
 * Provides endpoints for clients to discover server configuration
 */

import { Router, Request, Response } from 'express'

export function createConfigRouter(): Router {
  const router = Router()

  /**
   * GET /api/config
   * Returns server configuration that clients need at runtime
   * This allows clients to dynamically discover the server URL instead of
   * relying on build-time environment variables
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      // Get the current server URL from the request
      // In Cloud Run, we can use the Host header or construct from environment
      
      // Determine protocol - check X-Forwarded-Proto first (from Cloud Run proxy)
      // Then check req.protocol (requires trust proxy to be set in Express)
      // In production, always use HTTPS for security
      const isProduction = process.env.NODE_ENV === 'production'
      let protocol = 'https'
      
      if (!isProduction) {
        // In development, allow HTTP
        const forwardedProto = req.get('X-Forwarded-Proto')
        protocol = forwardedProto || req.protocol || 'http'
      }
      
      // Ensure protocol is https in production
      if (isProduction) {
        protocol = 'https'
      }
      
      // In development, always return localhost with the actual server port
      let host: string
      if (!isProduction) {
        // In development, use the actual server port from the request socket
        const serverPort = req.socket?.localPort || req.get('host')?.split(':')[1] || '2567'
        host = `localhost:${serverPort}`
      } else {
        // In production, use the Host header or env var
        host = req.get('host') || req.get('X-Forwarded-Host') || process.env.SERVER_URL || 'localhost:8080'
      }
      
      // Remove protocol prefix if present in host/env var
      const cleanHost = host.replace(/^https?:\/\//, '')
      
      // Construct the base URL - always use HTTPS in production
      const baseUrl = `${protocol}://${cleanHost}`
      
      // Convert to WebSocket URL
      const wsProtocol = protocol === 'https' ? 'wss' : 'ws'
      const wsUrl = `${wsProtocol}://${cleanHost}`

      res.json({
        success: true,
        config: {
          serverUrl: baseUrl,
          wsUrl: wsUrl,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  return router
}

