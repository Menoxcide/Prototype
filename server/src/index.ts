import express from 'express'
import { createServer } from 'http'
import * as net from 'net'
import { Server, Room } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { monitor } from '@colyseus/monitor'
import cors from 'cors'
import { NexusRoom } from './rooms/NexusRoom'
import { MonitoringServiceImpl } from './services/MonitoringService'
import { createMonitoringRouter } from './routes/monitoring'
import { createCharactersRouter } from './routes/characters'
import { createConfigRouter } from './routes/config'
import { redisService } from './services/RedisService'
import { initializeFirebaseAdmin } from './services/FirebaseAdmin'
import { createDatabaseService } from './services/DatabaseService'

const app = express()
// Cloud Run sets PORT env var, default to 8080 for production, 2567 for local dev
// Ensure PORT is always a valid number
const getPort = (): number => {
  const envPort = process.env.PORT
  if (envPort) {
    const port = Number(envPort)
    if (!isNaN(port) && port > 0) {
      return port
    }
  }
  return process.env.NODE_ENV === 'production' ? 8080 : 2567
}
const defaultPort = getPort()

// Trust proxy for Cloud Run (reads X-Forwarded-* headers)
// Cloud Run terminates SSL/TLS and forwards requests, so we need to trust the proxy
app.set('trust proxy', true)

// CORS configuration - allow all origins in development, specific origins in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))
app.use(express.json())

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    service: 'MARS://NEXUS Server',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Initialize Firebase Admin SDK
const firebaseInitialized = initializeFirebaseAdmin()
if (firebaseInitialized) {
  console.log('✅ Firebase Admin initialized successfully')
} else {
  console.warn('⚠️  Firebase Admin not initialized - authentication will be disabled')
  console.warn('   Set up firebase-service-account.json or FIREBASE_ADMIN_* environment variables')
}

// Create shared monitoring service
const globalMonitoringService = new MonitoringServiceImpl()

const server = createServer(app)
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    // Enable per-message deflate compression for WebSocket
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3 // Compression level (0-9, 3 is balanced)
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024 // Only compress messages larger than 1KB
    }
  })
})

// Handle unhandled errors from WebSocket transport
// Note: Seat reservation expired errors are handled by Colyseus internally
// but we can catch them here for logging
process.on('unhandledRejection', (reason, promise) => {
  if (reason instanceof Error && reason.message.includes('seat reservation expired')) {
    // Log but don't crash - this is expected when clients take too long to connect
    console.warn('⚠️  Seat reservation expired. This may happen if the client takes too long to connect.')
    return
  }
  // Let the default handler process other errors
})

// Register room with monitoring service and load balancing
gameServer.define('nexus', NexusRoom, {
  monitoringService: globalMonitoringService
}).enableRealtimeListing() // Enable room listing for load balancing

// Initialize database service for character management
const databaseService = createDatabaseService()
databaseService.connect().catch(err => {
  console.warn('Failed to connect to database:', err)
  console.warn('Character management endpoints will not work without database')
})

// Register monitoring endpoints
app.use('/colyseus', monitor())
app.use('/api/monitoring', createMonitoringRouter(globalMonitoringService))
app.use('/api/characters', createCharactersRouter(databaseService))
app.use('/api/config', createConfigRouter())

// Initialize Redis connection (optional, only if REDIS_URL is set)
if (process.env.REDIS_URL) {
  redisService.connect().catch(err => {
    console.warn('Failed to connect to Redis:', err)
    console.warn('Server will continue without Redis (single instance mode)')
  })
}

// Function to find an available port
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const isAvailable = await new Promise<boolean>((resolve) => {
      const testServer = net.createServer()
      testServer.listen(port, () => {
        testServer.once('close', () => resolve(true))
        testServer.close()
      })
      testServer.on('error', () => resolve(false))
    })
    
    if (isAvailable) {
      return port
    }
  }
  
  throw new Error(`Could not find an available port starting from ${startPort}`)
}

// Start server with automatic port retry
async function startServer() {
  console.log('🚀 Starting MARS://NEXUS Server...')
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔌 PORT environment variable: ${process.env.PORT || 'not set'}`)
  console.log(`🔢 Using port: ${defaultPort}`)
  
  let port = defaultPort
  
  // If PORT is not explicitly set, try to find available port (only for local dev)
  if (!process.env.PORT) {
    try {
      port = await findAvailablePort(defaultPort)
      if (port !== defaultPort) {
        console.log(`⚠️  Port ${defaultPort} is in use, using port ${port} instead`)
      }
    } catch (err) {
      console.error('❌ Failed to find available port:', err)
      process.exit(1)
    }
  }
  
  console.log(`🌐 Starting HTTP server on port ${port} (binding to 0.0.0.0)...`)
  
  // Start listening immediately - this is critical for Cloud Run health checks
  return new Promise<void>((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`✅ MARS://NEXUS Server listening on port ${port}`)
      console.log(`📊 Monitoring API available at http://0.0.0.0:${port}/api/monitoring`)
      console.log(`❤️  Health check available at http://0.0.0.0:${port}/health`)
      resolve()
    }).on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use.`)
        console.error(`   Please stop the other process using this port, or set PORT environment variable to use a different port.`)
        console.error(`   Example: PORT=2568 npm run dev`)
        reject(err)
      } else {
        console.error('❌ Server error:', err)
        reject(err)
      }
    })
  })
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit - let the server continue running
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  // Exit on uncaught exceptions as they indicate a serious problem
  process.exit(1)
})

// Start server immediately - don't wait for async services
startServer().catch((err) => {
  console.error('❌ Failed to start server:', err)
  console.error('   Error details:', err instanceof Error ? err.message : String(err))
  if (err instanceof Error && err.stack) {
    console.error('   Stack:', err.stack)
  }
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await redisService.disconnect()
  server.close()
  process.exit(0)
})

