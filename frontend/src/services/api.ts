import axios from 'axios'
import type { AuthUser } from '../types'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Auth API
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await api.get<{ user: AuthUser }>('/auth/me')
    return response.data.user
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  const response = await api.post<{ user: AuthUser }>('/auth/register', { email, password, name })
  return response.data.user
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await api.post<{ user: AuthUser }>('/auth/login', { email, password })
  return response.data.user
}

export function getGoogleAuthUrl(redirect?: string): string {
  const baseUrl = '/api/auth/google'
  if (redirect) {
    return `${baseUrl}?redirect=${encodeURIComponent(redirect)}`
  }
  return baseUrl
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
