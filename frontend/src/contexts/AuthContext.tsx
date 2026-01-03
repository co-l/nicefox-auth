import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCurrentUser, logout as apiLogout, setToken, getToken, clearToken } from '../services/api'
import type { AuthUser } from '../types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch {
      setUser(null)
      clearToken()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check for token in URL (returning from OAuth)
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('token')
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Only try to get user if we have a token
    if (getToken()) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [])

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
