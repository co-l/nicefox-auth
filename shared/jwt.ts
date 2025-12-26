import jwt from 'jsonwebtoken'
import type { TokenPayload } from './types'

export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    return jwt.verify(token, secret) as TokenPayload
  } catch {
    return null
  }
}
