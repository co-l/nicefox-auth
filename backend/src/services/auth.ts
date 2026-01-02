import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'
import { getSecretForDomain } from './jwtSecrets.js'
import type { AuthUser, TokenPayload, GoogleUserInfo } from '../types/index.js'

// Google OAuth URLs
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<{ accessToken: string }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.callbackUrl,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  const data = await response.json() as { access_token: string }
  return { accessToken: data.access_token }
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  return response.json() as Promise<GoogleUserInfo>
}

/**
 * Generate a JWT for a user, signed with the secret for the target domain.
 * @param user - The authenticated user
 * @param targetDomain - The domain this token is for (e.g., "compta.nicefox.net")
 * @throws Error if no secret is configured for the domain
 */
export function generateJwt(user: AuthUser, targetDomain: string): string {
  const secret = getSecretForDomain(targetDomain)
  if (!secret) {
    throw new Error(`No JWT secret configured for domain: ${targetDomain}`)
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions)
}

/**
 * Verify a JWT using the secret for the specified domain.
 * @param token - The JWT to verify
 * @param domain - The domain to use for secret lookup
 * @returns The decoded payload, or null if invalid
 */
export function verifyJwt(token: string, domain: string): TokenPayload | null {
  const secret = getSecretForDomain(domain)
  if (!secret) {
    return null
  }

  try {
    return jwt.verify(token, secret) as TokenPayload
  } catch {
    return null
  }
}

export function getCookieOptions() {
  const isProduction = config.nodeEnv === 'production'
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    domain: config.cookieDomain === 'localhost' ? undefined : config.cookieDomain,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  }
}
