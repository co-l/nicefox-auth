import dotenv from 'dotenv'
import path from 'path'

// Load .env from backend directory or parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5175',
  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',

  neo4j: {
    uri: requireEnv('NEO4J_URI'),
    user: requireEnv('NEO4J_USER'),
    password: requireEnv('NEO4J_PASSWORD'),
  },

  google: {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    callbackUrl: requireEnv('GOOGLE_CALLBACK_URL'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Allowed redirect hosts for security
  allowedRedirectHosts: [
    'localhost',
    'localhost:5174',
    'localhost:5175',
    'compta.nicefox.net',
    'compta.local.nicefox.net',
    'auth.nicefox.net',
    'auth.local.nicefox.net',
  ],
}

export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return config.allowedRedirectHosts.some(
      (host) => parsed.host === host || parsed.host.endsWith(`:${host.split(':')[1] || ''}`)
    )
  } catch {
    return false
  }
}
