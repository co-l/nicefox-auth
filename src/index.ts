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
 * In production (NODE_ENV=production), requires JWT_SECRET env var.
 * In development, uses DEV_JWT_SECRET.
 * @returns The JWT secret to use
 * @throws Error if in production and JWT_SECRET is not set
 */
export function getJwtSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    return secret
  }
  return DEV_JWT_SECRET
}
