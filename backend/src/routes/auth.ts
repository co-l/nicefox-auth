import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { config, isValidRedirectUrl } from '../config.js'
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  generateJwt,
  getCookieOptions,
} from '../services/auth.js'
import {
  createOrUpdateUser,
  createUserWithPassword,
  findUserByEmail,
  updateLastLogin,
} from '../db/userQueries.js'
import { authMiddleware } from '../middleware/auth.js'

const SALT_ROUNDS = 10

const router = Router()
const COOKIE_NAME = 'auth_token'

// Store state -> redirect URL mapping (in production, use Redis or similar)
const stateStore = new Map<string, { redirectUrl: string; tokenInUrl: boolean; expiresAt: number }>()

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
  const tokenInUrl = req.query.token_in_url === 'true'

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

  // Generate state for CSRF protection
  const state = crypto.randomUUID()
  stateStore.set(state, {
    redirectUrl: finalRedirect,
    tokenInUrl,
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

    // Generate JWT
    const token = generateJwt(user)

    // Set cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions())

    // Build redirect URL, optionally with token
    let redirectUrl = storedState.redirectUrl
    if (storedState.tokenInUrl) {
      const url = new URL(redirectUrl)
      url.searchParams.set('token', token)
      redirectUrl = url.toString()
    }

    // Redirect to original URL
    res.redirect(redirectUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`)
  }
})

// POST /api/auth/register - Register with email/password
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, includeToken } = req.body

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

    // Generate JWT and set cookie
    const token = generateJwt(user)
    res.cookie(COOKIE_NAME, token, getCookieOptions())

    // Return user without sensitive fields, optionally include token
    const { googleId, passwordHash: _, ...safeUser } = user
    res.status(201).json({ user: safeUser, ...(includeToken && { token }) })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login - Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, includeToken } = req.body

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

    // Generate JWT and set cookie
    const token = generateJwt(user)
    res.cookie(COOKIE_NAME, token, getCookieOptions())

    // Return user without sensitive fields, optionally include token
    const { googleId, passwordHash: _, ...safeUser } = user
    res.json({ user: safeUser, ...(includeToken && { token }) })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  // Return user without sensitive fields
  const { googleId, passwordHash, ...safeUser } = req.user
  res.json({ user: safeUser })
})

// POST /api/auth/logout - Clear auth cookie
router.post('/logout', (_req: Request, res: Response) => {
  res.cookie(COOKIE_NAME, '', {
    ...getCookieOptions(),
    maxAge: 0,
  })
  res.json({ success: true })
})

export default router
