import fs from 'fs'
import path from 'path'
import { config } from '../config.js'

// Hardcoded secret for zero-conf local development
const LOCALHOST_JWT_SECRET = 'nicefox-dev-secret-do-not-use-in-production'

// In-memory cache - read once, keep forever (until restart)
const secretCache = new Map<string, string>()

/**
 * Extract domain (hostname) from a URL.
 * e.g., "https://compta.nicefox.net/foo?bar=1" → "compta.nicefox.net"
 */
export function extractDomainFromUrl(url: string): string {
  const parsed = new URL(url)
  return parsed.hostname
}

/**
 * Validate that a domain string is safe for use as a filename.
 * Rejects path traversal attempts and invalid characters.
 */
function isValidDomain(domain: string): boolean {
  // Reject path traversal characters and empty strings
  if (!domain || domain.includes('/') || domain.includes('\\') || domain.includes('..') || domain.includes('\0')) {
    return false
  }
  // Must look like a hostname (alphanumeric, dots, hyphens)
  return /^[a-zA-Z0-9.-]+$/.test(domain)
}

/**
 * Get JWT secret for a given domain.
 * - Returns hardcoded secret for localhost (zero-conf dev)
 * - Returns cached value if available
 * - Reads from filesystem and caches on first access
 * - Returns null if no secret file exists (request should be rejected)
 */
export function getSecretForDomain(domain: string): string | null {
  // Localhost gets hardcoded secret for zero-conf local dev
  if (domain === 'localhost') {
    if (config.nodeEnv === 'production') {
      console.warn('WARNING: Rejecting localhost domain in production mode — potential Host header attack')
      return null
    }
    return LOCALHOST_JWT_SECRET
  }

  // Validate domain to prevent path traversal
  if (!isValidDomain(domain)) {
    console.warn(`WARNING: Rejected invalid domain for secret lookup: ${domain}`)
    return null
  }

  // Check cache first
  if (secretCache.has(domain)) {
    return secretCache.get(domain)!
  }

  // Try to read from filesystem — domain is validated, safe to join
  const secretPath = path.join(config.jwt.secretsDir, domain)
  
  try {
    const secret = fs.readFileSync(secretPath, 'utf-8').trim()
    secretCache.set(domain, secret)
    return secret
  } catch (err) {
    // File doesn't exist or can't be read
    return null
  }
}

/**
 * Check if a domain has a valid secret configured.
 */
export function hasSecretForDomain(domain: string): boolean {
  return getSecretForDomain(domain) !== null
}
