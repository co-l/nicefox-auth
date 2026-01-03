import axios from 'axios'
import type { AuthUser } from '../types'

const TOKEN_KEY = 'auth_token'

// Get stored token
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// Store token
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

// Clear token
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

const api = axios.create({
  baseURL: '/api',
})

// Add auth header to all requests
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await api.get<AuthUser>('/auth/me')
    return response.data
  } catch {
    return null
  }
}

export async function register(email: string, password: string, name: string): Promise<{ user: AuthUser; token: string }> {
  const response = await api.post<{ user: AuthUser; token: string }>('/auth/register', { email, password, name })
  setToken(response.data.token)
  return response.data
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const response = await api.post<{ user: AuthUser; token: string }>('/auth/login', { email, password })
  setToken(response.data.token)
  return response.data
}

export function getGoogleAuthUrl(redirect?: string): string {
  const baseUrl = '/api/auth/google'
  if (redirect) {
    return `${baseUrl}?redirect=${encodeURIComponent(redirect)}`
  }
  return baseUrl
}

export function logout(): void {
  clearToken()
  window.location.href = '/'
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
