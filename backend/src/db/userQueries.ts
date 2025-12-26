import { v4 as uuidv4 } from 'uuid'
import { getDriver } from './neo4j.js'
import type { AuthUser, GoogleUserInfo, RegisterInput } from '../types/index.js'

function recordToUser(record: Record<string, unknown>): AuthUser {
  return {
    id: record.id as string,
    email: record.email as string,
    googleId: (record.googleId as string) || null,
    passwordHash: (record.passwordHash as string) || null,
    name: record.name as string,
    avatarUrl: (record.avatarUrl as string) || null,
    role: record.role as 'user' | 'admin',
    createdAt: new Date(record.createdAt as string),
    lastLoginAt: new Date(record.lastLoginAt as string),
  }
}

export async function findUserByGoogleId(googleId: string): Promise<AuthUser | null> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `MATCH (u:Auth_User {googleId: $googleId})
       RETURN u { .* } as user`,
      { googleId }
    )

    if (result.records.length === 0) {
      return null
    }

    return recordToUser(result.records[0].get('user'))
  } finally {
    await session.close()
  }
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `MATCH (u:Auth_User {id: $id})
       RETURN u { .* } as user`,
      { id }
    )

    if (result.records.length === 0) {
      return null
    }

    return recordToUser(result.records[0].get('user'))
  } finally {
    await session.close()
  }
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `MATCH (u:Auth_User {email: $email})
       RETURN u { .* } as user`,
      { email }
    )

    if (result.records.length === 0) {
      return null
    }

    return recordToUser(result.records[0].get('user'))
  } finally {
    await session.close()
  }
}

export async function createOrUpdateUser(googleUser: GoogleUserInfo): Promise<AuthUser> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const now = new Date().toISOString()

    // Check if user exists
    const existingUser = await findUserByGoogleId(googleUser.sub)

    if (existingUser) {
      // Update last login and any changed info
      const result = await session.run(
        `MATCH (u:Auth_User {googleId: $googleId})
         SET u.lastLoginAt = $lastLoginAt,
             u.name = $name,
             u.avatarUrl = $avatarUrl
         RETURN u { .* } as user`,
        {
          googleId: googleUser.sub,
          lastLoginAt: now,
          name: googleUser.name,
          avatarUrl: googleUser.picture || null,
        }
      )
      return recordToUser(result.records[0].get('user'))
    }

    // Check if this is the first user (make them admin)
    const countResult = await session.run('MATCH (u:Auth_User) RETURN count(u) as count')
    const userCount = countResult.records[0].get('count').toNumber()
    const role = userCount === 0 ? 'admin' : 'user'

    // Create new user
    const result = await session.run(
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
       RETURN u { .* } as user`,
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

    return recordToUser(result.records[0].get('user'))
  } finally {
    await session.close()
  }
}

export async function createUserWithPassword(
  input: RegisterInput,
  passwordHash: string
): Promise<AuthUser> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const now = new Date().toISOString()

    // Check if this is the first user (make them admin)
    const countResult = await session.run('MATCH (u:Auth_User) RETURN count(u) as count')
    const userCount = countResult.records[0].get('count').toNumber()
    const role = userCount === 0 ? 'admin' : 'user'

    const result = await session.run(
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
       RETURN u { .* } as user`,
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

    return recordToUser(result.records[0].get('user'))
  } finally {
    await session.close()
  }
}

export async function updateLastLogin(id: string): Promise<void> {
  const driver = getDriver()
  const session = driver.session()

  try {
    await session.run(
      `MATCH (u:Auth_User {id: $id})
       SET u.lastLoginAt = $lastLoginAt`,
      { id, lastLoginAt: new Date().toISOString() }
    )
  } finally {
    await session.close()
  }
}

export async function getAllUsers(): Promise<AuthUser[]> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `MATCH (u:Auth_User)
       RETURN u { .* } as user
       ORDER BY u.createdAt DESC`
    )

    return result.records.map((record) => recordToUser(record.get('user')))
  } finally {
    await session.close()
  }
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<AuthUser | null> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `MATCH (u:Auth_User {id: $id})
       SET u.role = $role
       RETURN u { .* } as user`,
      { id, role }
    )

    if (result.records.length === 0) {
      return null
    }

    return recordToUser(result.records[0].get('user'))
  } finally {
    await session.close()
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `MATCH (u:Auth_User {id: $id})
       DELETE u
       RETURN count(u) as deleted`,
      { id }
    )

    return result.records[0].get('deleted').toNumber() > 0
  } finally {
    await session.close()
  }
}
