import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { initClient, verifyConnection, closeClient } from './db/graphdb.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'

const app = express()

// Security: disable X-Powered-By header
app.disable('x-powered-by')

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', "default-src 'none'")
  if (config.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

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
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Global error handler - suppress stack traces
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log full error server-side
  console.error('Unhandled error:', err)

  // Return safe error to client (no stack traces or internal paths)
  const status = (err as any).status || (err as any).statusCode || 500
  const message = status === 400 ? 'Bad request' : 'Internal server error'
  res.status(status).json({ error: message })
})

// Start server
async function start() {
  try {
    // Initialize GraphDB client
    await initClient({
      url: config.graphdb.url,
      project: config.graphdb.project,
      env: config.nodeEnv === 'production' ? 'production' : 'test',
      apiKey: config.graphdb.apiKey,
    })
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
process.on('SIGTERM', () => {
  console.log('Shutting down...')
  closeClient()
  process.exit(0)
})

start()
