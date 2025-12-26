export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: 'user' | 'admin'
  createdAt: string
  lastLoginAt: string
}

export interface ApiError {
  error: string
}
