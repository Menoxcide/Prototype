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
import { redisService } from './services/RedisService'
import { initializeFirebaseAdmin } from './services/FirebaseAdmin'

const app = express()
const defaultPort = Number(process.env.PORT || 2567)

app.use(cors())
app.use(express.json())

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
    server
  })
})

// Register room with monitoring service
gameServer.define('nexus', NexusRoom, {
  monitoringService: globalMonitoringService
})

// Register monitoring endpoints
app.use('/colyseus', monitor())
app.use('/api/monitoring', createMonitoringRouter(globalMonitoringService))

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
  let port = defaultPort
  
  // If PORT is explicitly set, use it; otherwise try to find available port
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
  
  server.listen(port, () => {
    console.log(`🚀 NEX://VOID Server listening on ws://localhost:${port}`)
    console.log(`📊 Monitoring API available at http://localhost:${port}/api/monitoring`)
  }).on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use.`)
      console.error(`   Please stop the other process using this port, or set PORT environment variable to use a different port.`)
      console.error(`   Example: PORT=2568 npm run dev`)
      process.exit(1)
    } else {
      console.error('❌ Server error:', err)
      process.exit(1)
    }
  })
}

startServer()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await redisService.disconnect()
  server.close()
  process.exit(0)
})

