import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { verifyConnection, closeConnection } from './db/neo4j.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'

const app = express()

// Middleware
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5175', 'http://localhost:5174'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Start server
async function start() {
  try {
    await verifyConnection()
    
    app.listen(config.port, () => {
      console.log(`Auth server running on port ${config.port}`)
      console.log(`Frontend URL: ${config.frontendUrl}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  await closeConnection()
  process.exit(0)
})

start()
