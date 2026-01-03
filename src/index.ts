// Main entry point for nicefox-auth package

// Middleware exports
export {
  authMiddleware,
  requireAdmin,
  optionalAuthMiddleware,
  getLoginUrl,
} from './middleware'
export type { AuthMiddlewareOptions } from './middleware'

// JWT exports
export { verifyToken } from './jwt'

// Type exports
export type { AuthUser, TokenPayload } from './types'

// Constants
export const DEV_JWT_SECRET = 'nicefox-dev-secret-do-not-use-in-production'

/**
 * Get the JWT secret for the current environment.
 * Uses DEV_JWT_SECRET for localhost, otherwise requires JWT_SECRET env var.
 * @param hostname - The hostname to check (e.g., req.hostname or process.env.HOST)
 * @returns The JWT secret to use
 * @throws Error if not localhost and JWT_SECRET is not set
 */
export function getJwtSecret(hostname?: string): string {
  const host = hostname || process.env.HOST || 'localhost'
  
  if (host === 'localhost' || host === '127.0.0.1') {
    return DEV_JWT_SECRET
  }
  
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  return secret
}
