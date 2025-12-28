import { v4 as uuidv4 } from 'uuid'
import { getClient } from './graphdb.js'
import type { AuthUser, GoogleUserInfo, RegisterInput } from '../types/index.js'
import type { TestClient } from 'nicefox-graphdb/packages/client/src/index.ts'

// For testing - allows injecting a test client
let testClient: TestClient | null = null

export function setTestClient(client: TestClient | null): void {
  testClient = client
}

function getDb() {
  if (testClient) {
    return testClient
  }
  return getClient()
}

// GraphDB returns nodes as { id, label, properties: {...} }
interface GraphNode {
  id: string
  label: string
  properties: Record<string, unknown>
}

function recordToUser(node: GraphNode): AuthUser {
  const props = node.properties
  return {
    id: props.id as string,
    email: props.email as string,
    googleId: (props.googleId as string) || null,
    passwordHash: (props.passwordHash as string) || null,
    name: props.name as string,
    avatarUrl: (props.avatarUrl as string) || null,
    role: props.role as 'user' | 'admin',
    createdAt: new Date(props.createdAt as string),
    lastLoginAt: new Date(props.lastLoginAt as string),
  }
}

export async function findUserByGoogleId(googleId: string): Promise<AuthUser | null> {
  const db = getDb()

  const result = await db.query<{ u: GraphNode }>(
    `MATCH (u:Auth_User {googleId: $googleId})
     RETURN u`,
    { googleId }
  )

  if (result.length === 0) {
    return null
  }

  return recordToUser(result[0].u)
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const db = getDb()

  const result = await db.query<{ u: GraphNode }>(
    `MATCH (u:Auth_User {id: $id})
     RETURN u`,
    { id }
  )

  if (result.length === 0) {
    return null
  }

  return recordToUser(result[0].u)
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const db = getDb()

  const result = await db.query<{ u: GraphNode }>(
    `MATCH (u:Auth_User {email: $email})
     RETURN u`,
    { email }
  )

  if (result.length === 0) {
    return null
  }

  return recordToUser(result[0].u)
}

export async function createOrUpdateUser(googleUser: GoogleUserInfo): Promise<AuthUser> {
  const db = getDb()
  const now = new Date().toISOString()

  // Check if user exists
  const existingUser = await findUserByGoogleId(googleUser.sub)

  if (existingUser) {
    // Update last login and any changed info
    const result = await db.query<{ u: GraphNode }>(
      `MATCH (u:Auth_User {googleId: $googleId})
       SET u.lastLoginAt = $lastLoginAt,
           u.name = $name,
           u.avatarUrl = $avatarUrl
       RETURN u`,
      {
        googleId: googleUser.sub,
        lastLoginAt: now,
        name: googleUser.name,
        avatarUrl: googleUser.picture || null,
      }
    )
    return recordToUser(result[0].u)
  }

  // Check if this is the first user (make them admin)
  const countResult = await db.query<{ count: number }>(
    'MATCH (u:Auth_User) RETURN COUNT(u) as count'
  )
  const userCount = countResult[0]?.count ?? 0
  const role = userCount === 0 ? 'admin' : 'user'

  // Create new user
  const result = await db.query<{ u: GraphNode }>(
    `CREATE (u:Auth_User {
       id: $id,
       email: $email,
       googleId: $googleId,
       passwordHash: null,
       name: $name,
       avatarUrl: $avatarUrl,
       role: $role,
       createdAt: $createdAt,
       lastLoginAt: $lastLoginAt
     })
     RETURN u`,
    {
      id: uuidv4(),
      email: googleUser.email,
      googleId: googleUser.sub,
      name: googleUser.name,
      avatarUrl: googleUser.picture || null,
      role,
      createdAt: now,
      lastLoginAt: now,
    }
  )

  return recordToUser(result[0].u)
}

export async function createUserWithPassword(
  input: RegisterInput,
  passwordHash: string
): Promise<AuthUser> {
  const db = getDb()
  const now = new Date().toISOString()

  // Check if this is the first user (make them admin)
  const countResult = await db.query<{ count: number }>(
    'MATCH (u:Auth_User) RETURN COUNT(u) as count'
  )
  const userCount = countResult[0]?.count ?? 0
  const role = userCount === 0 ? 'admin' : 'user'

  const result = await db.query<{ u: GraphNode }>(
    `CREATE (u:Auth_User {
       id: $id,
       email: $email,
       googleId: null,
       passwordHash: $passwordHash,
       name: $name,
       avatarUrl: null,
       role: $role,
       createdAt: $createdAt,
       lastLoginAt: $lastLoginAt
     })
     RETURN u`,
    {
      id: uuidv4(),
      email: input.email,
      passwordHash,
      name: input.name,
      role,
      createdAt: now,
      lastLoginAt: now,
    }
  )

  return recordToUser(result[0].u)
}

export async function updateLastLogin(id: string): Promise<void> {
  const db = getDb()

  await db.execute(
    `MATCH (u:Auth_User {id: $id})
     SET u.lastLoginAt = $lastLoginAt`,
    { id, lastLoginAt: new Date().toISOString() }
  )
}

export async function getAllUsers(): Promise<AuthUser[]> {
  const db = getDb()

  const result = await db.query<{ u: GraphNode }>(
    `MATCH (u:Auth_User)
     RETURN u
     ORDER BY u.createdAt DESC`
  )

  return result.map((record) => recordToUser(record.u))
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<AuthUser | null> {
  const db = getDb()

  const result = await db.query<{ u: GraphNode }>(
    `MATCH (u:Auth_User {id: $id})
     SET u.role = $role
     RETURN u`,
    { id, role }
  )

  if (result.length === 0) {
    return null
  }

  return recordToUser(result[0].u)
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = getDb()

  // First check if user exists
  const user = await findUserById(id)
  if (!user) {
    return false
  }

  await db.execute(
    `MATCH (u:Auth_User {id: $id})
     DELETE u`,
    { id }
  )

  return true
}
