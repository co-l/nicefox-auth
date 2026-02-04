import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
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
  findUserById,
  updateLastLogin,
} from '../db/userQueries.js'
import { extractDomainFromUrl, getSecretForDomain } from '../services/jwtSecrets.js'

const SALT_ROUNDS = 10

// Pre-computed dummy hash for timing-safe login (prevents user enumeration via timing)
const DUMMY_HASH = '$2b$10$nhlTd3uc3HFLy5YeAHgQKezGVIK0zanavpvnW4ctpKVw9ILKFDFzy'

const router = Router()

// Rate limiting for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip || 'unknown',
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 token exchanges per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const meLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

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
    res.status(400).json({ error: 'Invalid redirect URL' })
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
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
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

    // Check if email already exists (use generic error to prevent enumeration)
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      res.status(400).json({ error: 'Registration failed. Please check your details and try again.' })
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
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    // Find user by email
    const user = await findUserByEmail(email)

    // Timing-safe: always run bcrypt comparison to prevent user enumeration
    const hashToCompare = user?.passwordHash || DUMMY_HASH
    const isValid = await bcrypt.compare(password, hashToCompare)

    if (!user || !user.passwordHash || !isValid) {
      // Unified error message for all failure cases (user not found, Google-only, wrong password)
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

// POST /api/auth/token - Get a token for a specific redirect domain
// Requires valid auth token, returns new token signed for target domain
router.post('/token', tokenLimiter, async (req: Request, res: Response) => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const token = authHeader.slice(7)

    // Verify token using request hostname (auth service's domain)
    const { verifyJwt } = await import('../services/auth.js')
    const payload = verifyJwt(token, req.hostname)
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Validate redirect URL
    const { redirect } = req.body
    if (!redirect || typeof redirect !== 'string') {
      res.status(400).json({ error: 'redirect URL is required' })
      return
    }

    if (!isValidRedirectUrl(redirect)) {
      res.status(400).json({ error: 'Invalid redirect URL' })
      return
    }

    // Extract domain and verify we have a secret for it
    const domain = extractDomainFromUrl(redirect)
    const secret = getSecretForDomain(domain)
    if (!secret) {
      res.status(400).json({ error: 'Invalid redirect URL' })
      return
    }

    // Get user from database
    const user = await findUserById(payload.userId)
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    // Generate token for target domain
    const newToken = generateJwt(user, domain)

    res.json({ token: newToken })
  } catch (error) {
    console.error('Token generation error:', error)
    res.status(500).json({ error: 'Token generation failed' })
  }
})

// GET /api/auth/me - Get current user
// Verifies token from Authorization Bearer header
router.get('/me', meLimiter, async (req: Request, res: Response) => {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const token = authHeader.slice(7)

  // Get domain from query param or request hostname
  // Validate domain to prevent path traversal attacks
  const rawDomain = (req.query.domain as string) || req.hostname
  if (rawDomain.includes('/') || rawDomain.includes('\\') || rawDomain.includes('..')) {
    res.status(400).json({ error: 'Invalid domain' })
    return
  }
  const domain = rawDomain

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
