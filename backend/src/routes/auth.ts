import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { config, isValidRedirectUrl } from '../config.js'
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  generateJwt,
} from '../services/auth.js'
import {
  createOrUpdateUser,
  createUserWithPassword,
  findUserByEmail,
  updateLastLogin,
} from '../db/userQueries.js'
import { extractDomainFromUrl, getSecretForDomain } from '../services/jwtSecrets.js'

const SALT_ROUNDS = 10

const router = Router()

// Store state -> redirect URL mapping (in production, use Redis or similar)
const stateStore = new Map<string, { redirectUrl: string; domain: string; expiresAt: number }>()

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of stateStore.entries()) {
    if (value.expiresAt < now) {
      stateStore.delete(key)
    }
  }
}, 60000) // Every minute

// GET /api/auth/google - Initiate Google OAuth flow
router.get('/google', (req: Request, res: Response) => {
  const redirectUrl = req.query.redirect as string | undefined

  // Validate redirect URL
  let finalRedirect = config.frontendUrl
  if (redirectUrl) {
    if (isValidRedirectUrl(redirectUrl)) {
      finalRedirect = redirectUrl
    } else {
      res.status(400).json({ error: 'Invalid redirect URL' })
      return
    }
  }

  // Extract domain and verify we have a secret for it
  const domain = extractDomainFromUrl(finalRedirect)
  if (!getSecretForDomain(domain)) {
    res.status(400).json({ error: `No JWT secret configured for domain: ${domain}` })
    return
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID()
  stateStore.set(state, {
    redirectUrl: finalRedirect,
    domain,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  })

  const authUrl = generateAuthUrl(state)
  res.redirect(authUrl)
})

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query

    if (error) {
      console.error('Google OAuth error:', error)
      res.redirect(`${config.frontendUrl}/login?error=oauth_denied`)
      return
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${config.frontendUrl}/login?error=no_code`)
      return
    }

    if (!state || typeof state !== 'string') {
      res.redirect(`${config.frontendUrl}/login?error=no_state`)
      return
    }

    // Verify state
    const storedState = stateStore.get(state)
    if (!storedState) {
      res.redirect(`${config.frontendUrl}/login?error=invalid_state`)
      return
    }
    stateStore.delete(state)

    // Exchange code for tokens
    const { accessToken } = await exchangeCodeForTokens(code)

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(accessToken)

    // Create or update user in database
    const user = await createOrUpdateUser(googleUser)

    // Generate JWT with domain-specific secret
    const token = generateJwt(user, storedState.domain)

    // Build redirect URL with token
    const url = new URL(storedState.redirectUrl)
    url.searchParams.set('token', token)

    // Redirect to original URL with token
    res.redirect(url.toString())
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`)
  }
})

// POST /api/auth/register - Register with email/password
// Used by auth service itself - uses request hostname for domain
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' })
      return
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await createUserWithPassword({ email, password, name }, passwordHash)

    // Use request hostname as domain (auth service's own domain)
    const domain = req.hostname

    // Generate JWT
    const token = generateJwt(user, domain)

    // Return user without sensitive fields, always include token
    const { googleId, passwordHash: _, ...safeUser } = user
    res.status(201).json({ user: safeUser, token })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login - Login with email/password
// Used by auth service itself - uses request hostname for domain
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    // Find user by email
    const user = await findUserByEmail(email)
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    // Check if user has a password (might be Google-only account)
    if (!user.passwordHash) {
      res.status(401).json({ error: 'This account uses Google sign-in' })
      return
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    // Update last login
    await updateLastLogin(user.id)

    // Use request hostname as domain (auth service's own domain)
    const domain = req.hostname

    // Generate JWT
    const token = generateJwt(user, domain)

    // Return user without sensitive fields, always include token
    const { googleId, passwordHash: _, ...safeUser } = user
    res.json({ user: safeUser, token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me - Get current user
// Verifies token from Authorization Bearer header
router.get('/me', async (req: Request, res: Response) => {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const token = authHeader.slice(7)

  // Get domain from query param or request hostname
  const domain = (req.query.domain as string) || req.hostname

  // Import verifyJwt dynamically to use domain-specific verification
  const { verifyJwt } = await import('../services/auth.js')
  const payload = verifyJwt(token, domain)
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  // Fetch full user from database
  const { findUserById } = await import('../db/userQueries.js')
  const user = await findUserById(payload.userId)
  if (!user) {
    res.status(401).json({ error: 'User not found' })
    return
  }

  // Return user without sensitive fields
  const { googleId, passwordHash, ...safeUser } = user
  res.json(safeUser)
})

export default router
