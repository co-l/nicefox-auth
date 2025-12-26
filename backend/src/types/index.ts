export interface AuthUser {
  id: string
  email: string
  googleId: string | null
  passwordHash: string | null
  name: string
  avatarUrl: string | null
  role: 'user' | 'admin'
  createdAt: Date
  lastLoginAt: Date
}

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface TokenPayload {
  userId: string
  email: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

export interface GoogleUserInfo {
  sub: string
  email: string
  name: string
  picture?: string
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
