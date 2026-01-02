import axios from 'axios'
import type { AuthUser } from '../types'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Get current domain for JWT secret lookup
function getCurrentDomain(): string {
  return window.location.hostname
}

// Auth API
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const domain = getCurrentDomain()
    const response = await api.get<{ user: AuthUser }>(`/auth/me?domain=${encodeURIComponent(domain)}`)
    return response.data.user
  } catch {
    return null
  }
}

export async function getCurrentUserWithToken(): Promise<{ user: AuthUser; token: string } | null> {
  try {
    const domain = getCurrentDomain()
    const response = await api.get<{ user: AuthUser; token: string }>(`/auth/me?domain=${encodeURIComponent(domain)}&include_token=true`)
    return response.data
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function register(email: string, password: string, name: string, includeToken?: boolean): Promise<{ user: AuthUser; token?: string }> {
  const response = await api.post<{ user: AuthUser; token?: string }>('/auth/register', { email, password, name, includeToken })
  return response.data
}

export async function login(email: string, password: string, includeToken?: boolean): Promise<{ user: AuthUser; token?: string }> {
  const response = await api.post<{ user: AuthUser; token?: string }>('/auth/login', { email, password, includeToken })
  return response.data
}

export function getGoogleAuthUrl(redirect?: string, tokenInUrl?: boolean): string {
  const baseUrl = '/api/auth/google'
  const params = new URLSearchParams()
  if (redirect) {
    params.set('redirect', redirect)
  }
  if (tokenInUrl) {
    params.set('token_in_url', 'true')
  }
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

// Users API (admin only)
export async function getUsers(): Promise<AuthUser[]> {
  const response = await api.get<{ users: AuthUser[] }>('/users')
  return response.data.users
}

export async function getUser(id: string): Promise<AuthUser> {
  const response = await api.get<{ user: AuthUser }>(`/users/${id}`)
  return response.data.user
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<AuthUser> {
  const response = await api.patch<{ user: AuthUser }>(`/users/${id}`, { role })
  return response.data.user
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}
