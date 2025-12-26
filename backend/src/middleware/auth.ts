import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../services/auth.js'
import { findUserById } from '../db/userQueries.js'

const COOKIE_NAME = 'auth_token'

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies[COOKIE_NAME]

    if (!token) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const payload = verifyJwt(token)
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Fetch full user from database
    const user = await findUserById(payload.userId)
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // authMiddleware must run first
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  next()
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = req.cookies[COOKIE_NAME]

  if (token) {
    const payload = verifyJwt(token)
    if (payload) {
      // Don't fetch user, just attach payload for quick checks
      findUserById(payload.userId).then((user) => {
        if (user) {
          req.user = user
        }
        next()
      }).catch(() => {
        next()
      })
      return
    }
  }

  next()
}
