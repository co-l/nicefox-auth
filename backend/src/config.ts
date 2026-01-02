import dotenv from 'dotenv'
import path from 'path'

// Load .env from current working directory (backend/)
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

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

  graphdb: {
    url: requireEnv('GRAPHDB_URL'),
    project: process.env.GRAPHDB_PROJECT || 'auth',
    apiKey: process.env.GRAPHDB_API_KEY,
  },

  google: {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    callbackUrl: requireEnv('GOOGLE_CALLBACK_URL'),
  },

  jwt: {
    secretsDir: process.env.JWT_SECRETS_DIR || '/var/lib/nicefox-auth/secrets',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

}

export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname

    // Allow localhost (any port)
    if (host === 'localhost') {
      return true
    }

    // Allow any *.nicefox.net subdomain
    if (host === 'nicefox.net' || host.endsWith('.nicefox.net')) {
      return true
    }

    return false
  } catch {
    return false
  }
}
