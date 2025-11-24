import express from 'express'
import { createServer } from 'http'
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
const port = Number(process.env.PORT || 2567)

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

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await redisService.disconnect()
  server.close()
  process.exit(0)
})

