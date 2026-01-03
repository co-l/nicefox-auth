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
