import {
  findUserById,
  findUserByEmail,
  getAllUsers,
  updateUserRole,
  deleteUser,
} from '../db/userQueries.js'
import type { AuthUser } from '../types/index.js'

export async function getUserById(id: string): Promise<AuthUser | null> {
  return findUserById(id)
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  return findUserByEmail(email)
}

export async function listAllUsers(): Promise<AuthUser[]> {
  return getAllUsers()
}

export async function changeUserRole(id: string, role: 'user' | 'admin'): Promise<AuthUser | null> {
  return updateUserRole(id, role)
}

export async function removeUser(id: string): Promise<boolean> {
  return deleteUser(id)
}
