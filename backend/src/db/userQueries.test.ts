import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient, type TestClient } from 'nicefox-graphdb/packages/client/src/index.ts'
import {
  findUserByGoogleId,
  findUserById,
  findUserByEmail,
  createOrUpdateUser,
  createUserWithPassword,
  updateLastLogin,
  getAllUsers,
  updateUserRole,
  deleteUser,
  setTestClient,
} from './userQueries.js'
import type { GoogleUserInfo } from '../types/index.js'

describe('userQueries', () => {
  let testClient: TestClient

  beforeAll(async () => {
    testClient = await createTestClient({ project: 'auth' })
    setTestClient(testClient)
  })

  afterAll(() => {
    testClient.close()
  })

  beforeEach(async () => {
    // Clear all Auth_User nodes before each test
    await testClient.execute('MATCH (u:Auth_User) DELETE u')
  })

  describe('findUserByGoogleId', () => {
    it('should return null when user does not exist', async () => {
      const user = await findUserByGoogleId('nonexistent')
      expect(user).toBeNull()
    })

    it('should return user when found', async () => {
      // Create a user first
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'user-1',
          email: 'test@example.com',
          googleId: 'google-123',
          passwordHash: null,
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const user = await findUserByGoogleId('google-123')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('user-1')
      expect(user!.email).toBe('test@example.com')
      expect(user!.googleId).toBe('google-123')
      expect(user!.name).toBe('Test User')
      expect(user!.role).toBe('user')
    })
  })

  describe('findUserById', () => {
    it('should return null when user does not exist', async () => {
      const user = await findUserById('nonexistent')
      expect(user).toBeNull()
    })

    it('should return user when found', async () => {
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'user-2',
          email: 'test2@example.com',
          googleId: 'google-456',
          passwordHash: null,
          name: 'Test User 2',
          avatarUrl: null,
          role: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const user = await findUserById('user-2')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('user-2')
      expect(user!.email).toBe('test2@example.com')
      expect(user!.role).toBe('admin')
    })
  })

  describe('findUserByEmail', () => {
    it('should return null when user does not exist', async () => {
      const user = await findUserByEmail('nonexistent@example.com')
      expect(user).toBeNull()
    })

    it('should return user when found', async () => {
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'user-3',
          email: 'findme@example.com',
          googleId: null,
          passwordHash: 'hashed',
          name: 'Find Me',
          avatarUrl: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const user = await findUserByEmail('findme@example.com')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('user-3')
      expect(user!.email).toBe('findme@example.com')
      expect(user!.passwordHash).toBe('hashed')
    })
  })

  describe('createOrUpdateUser', () => {
    it('should create a new user with admin role when first user', async () => {
      const googleUser: GoogleUserInfo = {
        sub: 'google-new',
        email: 'new@example.com',
        name: 'New User',
        picture: 'https://example.com/pic.png',
      }

      const user = await createOrUpdateUser(googleUser)

      expect(user.email).toBe('new@example.com')
      expect(user.googleId).toBe('google-new')
      expect(user.name).toBe('New User')
      expect(user.avatarUrl).toBe('https://example.com/pic.png')
      expect(user.role).toBe('admin') // First user is admin
    })

    it('should create a new user with user role when not first user', async () => {
      // Create first user
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'existing-user',
          email: 'existing@example.com',
          googleId: 'google-existing',
          passwordHash: null,
          name: 'Existing User',
          avatarUrl: null,
          role: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const googleUser: GoogleUserInfo = {
        sub: 'google-second',
        email: 'second@example.com',
        name: 'Second User',
      }

      const user = await createOrUpdateUser(googleUser)

      expect(user.email).toBe('second@example.com')
      expect(user.role).toBe('user') // Not first user, so regular role
    })

    it('should update existing user on login', async () => {
      // Create existing user
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'update-user',
          email: 'update@example.com',
          googleId: 'google-update',
          passwordHash: null,
          name: 'Old Name',
          avatarUrl: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const googleUser: GoogleUserInfo = {
        sub: 'google-update',
        email: 'update@example.com',
        name: 'New Name',
        picture: 'https://example.com/new-pic.png',
      }

      const user = await createOrUpdateUser(googleUser)

      expect(user.id).toBe('update-user')
      expect(user.name).toBe('New Name')
      expect(user.avatarUrl).toBe('https://example.com/new-pic.png')
      expect(user.role).toBe('user') // Role shouldn't change
    })
  })

  describe('createUserWithPassword', () => {
    it('should create a user with password and admin role when first user', async () => {
      const user = await createUserWithPassword(
        { email: 'pwd@example.com', name: 'Password User', password: 'ignored' },
        'hashed-password'
      )

      expect(user.email).toBe('pwd@example.com')
      expect(user.passwordHash).toBe('hashed-password')
      expect(user.googleId).toBeNull()
      expect(user.role).toBe('admin')
    })

    it('should create a user with user role when not first user', async () => {
      // Create first user
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'first-user',
          email: 'first@example.com',
          googleId: 'google-first',
          passwordHash: null,
          name: 'First User',
          avatarUrl: null,
          role: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const user = await createUserWithPassword(
        { email: 'second-pwd@example.com', name: 'Second Pwd User', password: 'ignored' },
        'hashed-password-2'
      )

      expect(user.email).toBe('second-pwd@example.com')
      expect(user.role).toBe('user')
    })
  })

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      const oldDate = '2024-01-01T00:00:00.000Z'
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'login-user',
          email: 'login@example.com',
          googleId: 'google-login',
          passwordHash: null,
          name: 'Login User',
          avatarUrl: null,
          role: 'user',
          createdAt: '${oldDate}',
          lastLoginAt: '${oldDate}'
        })
      `)

      await updateLastLogin('login-user')

      const user = await findUserById('login-user')
      expect(user).not.toBeNull()
      expect(user!.lastLoginAt.getTime()).toBeGreaterThan(new Date(oldDate).getTime())
    })
  })

  describe('getAllUsers', () => {
    it('should return empty array when no users', async () => {
      const users = await getAllUsers()
      expect(users).toEqual([])
    })

    it('should return all users ordered by createdAt DESC', async () => {
      await testClient.execute(`
        CREATE (u1:Auth_User {
          id: 'user-a',
          email: 'a@example.com',
          googleId: 'google-a',
          passwordHash: null,
          name: 'User A',
          avatarUrl: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)
      await testClient.execute(`
        CREATE (u2:Auth_User {
          id: 'user-b',
          email: 'b@example.com',
          googleId: 'google-b',
          passwordHash: null,
          name: 'User B',
          avatarUrl: null,
          role: 'admin',
          createdAt: '2024-01-02T00:00:00.000Z',
          lastLoginAt: '2024-01-02T00:00:00.000Z'
        })
      `)

      const users = await getAllUsers()
      expect(users).toHaveLength(2)
      // Most recent first
      expect(users[0].id).toBe('user-b')
      expect(users[1].id).toBe('user-a')
    })
  })

  describe('updateUserRole', () => {
    it('should return null when user does not exist', async () => {
      const user = await updateUserRole('nonexistent', 'admin')
      expect(user).toBeNull()
    })

    it('should update user role', async () => {
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'role-user',
          email: 'role@example.com',
          googleId: 'google-role',
          passwordHash: null,
          name: 'Role User',
          avatarUrl: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const user = await updateUserRole('role-user', 'admin')
      expect(user).not.toBeNull()
      expect(user!.role).toBe('admin')
    })
  })

  describe('deleteUser', () => {
    it('should return false when user does not exist', async () => {
      const deleted = await deleteUser('nonexistent')
      expect(deleted).toBe(false)
    })

    it('should delete user and return true', async () => {
      await testClient.execute(`
        CREATE (u:Auth_User {
          id: 'delete-user',
          email: 'delete@example.com',
          googleId: 'google-delete',
          passwordHash: null,
          name: 'Delete User',
          avatarUrl: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-01-01T00:00:00.000Z'
        })
      `)

      const deleted = await deleteUser('delete-user')
      expect(deleted).toBe(true)

      const user = await findUserById('delete-user')
      expect(user).toBeNull()
    })
  })
})
