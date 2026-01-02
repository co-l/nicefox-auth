#!/usr/bin/env npx ts-node
/**
 * nicefox-auth-cli - Admin CLI for managing per-app JWT secrets
 * 
 * Usage:
 *   npx ts-node cli/nicefox-auth-cli.ts secret get <domain>
 *   npx ts-node cli/nicefox-auth-cli.ts secret rotate <domain>
 *   npx ts-node cli/nicefox-auth-cli.ts secret list
 *   npx ts-node cli/nicefox-auth-cli.ts secret delete <domain>
 * 
 * Environment:
 *   JWT_SECRETS_DIR - Directory to store secrets (default: /var/lib/nicefox-auth/secrets)
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const SECRETS_DIR = process.env.JWT_SECRETS_DIR || '/var/lib/nicefox-auth/secrets'

/**
 * Generate a cryptographically secure random secret
 */
function generateSecret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Ensure the secrets directory exists with proper permissions
 */
function ensureSecretsDir(): void {
  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 })
    console.error(`Created secrets directory: ${SECRETS_DIR}`)
  }
}

/**
 * Get the path to a secret file for a domain
 */
function getSecretPath(domain: string): string {
  // Basic validation - domain should not contain path separators
  if (domain.includes('/') || domain.includes('\\') || domain.includes('..')) {
    throw new Error(`Invalid domain: ${domain}`)
  }
  return path.join(SECRETS_DIR, domain)
}

/**
 * Get or create a secret for a domain
 * Prints the secret to stdout
 */
function secretGet(domain: string): void {
  ensureSecretsDir()
  const secretPath = getSecretPath(domain)

  if (fs.existsSync(secretPath)) {
    // Return existing secret
    const secret = fs.readFileSync(secretPath, 'utf-8').trim()
    console.log(secret)
  } else {
    // Generate and save new secret
    const secret = generateSecret()
    fs.writeFileSync(secretPath, secret, { mode: 0o600 })
    console.error(`Created new secret for: ${domain}`)
    console.log(secret)
  }
}

/**
 * Rotate (regenerate) a secret for a domain
 * Prints the new secret to stdout
 */
function secretRotate(domain: string): void {
  ensureSecretsDir()
  const secretPath = getSecretPath(domain)

  const secret = generateSecret()
  fs.writeFileSync(secretPath, secret, { mode: 0o600 })
  console.error(`Rotated secret for: ${domain}`)
  console.log(secret)
}

/**
 * List all domains with secrets
 */
function secretList(): void {
  if (!fs.existsSync(SECRETS_DIR)) {
    console.error('No secrets directory found')
    return
  }

  const files = fs.readdirSync(SECRETS_DIR)
  if (files.length === 0) {
    console.error('No secrets configured')
    return
  }

  for (const file of files.sort()) {
    console.log(file)
  }
}

/**
 * Delete a secret for a domain
 */
function secretDelete(domain: string): void {
  const secretPath = getSecretPath(domain)

  if (!fs.existsSync(secretPath)) {
    console.error(`No secret found for: ${domain}`)
    process.exit(1)
  }

  fs.unlinkSync(secretPath)
  console.error(`Deleted secret for: ${domain}`)
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.error(`
nicefox-auth-cli - Admin CLI for managing per-app JWT secrets

Usage:
  nicefox-auth-cli secret get <domain>      Get or create secret for domain
  nicefox-auth-cli secret rotate <domain>   Regenerate secret for domain
  nicefox-auth-cli secret list              List all domains with secrets
  nicefox-auth-cli secret delete <domain>   Delete secret for domain

Environment:
  JWT_SECRETS_DIR  Directory to store secrets
                   Default: /var/lib/nicefox-auth/secrets
                   Current: ${SECRETS_DIR}

Examples:
  nicefox-auth-cli secret get compta.nicefox.net
  nicefox-auth-cli secret get localhost
  nicefox-auth-cli secret rotate app.nicefox.net
  nicefox-auth-cli secret list
`)
}

// Main entry point
function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printUsage()
    process.exit(1)
  }

  const [command, subcommand, domain] = args

  if (command !== 'secret') {
    console.error(`Unknown command: ${command}`)
    printUsage()
    process.exit(1)
  }

  switch (subcommand) {
    case 'get':
      if (!domain) {
        console.error('Error: domain is required')
        process.exit(1)
      }
      secretGet(domain)
      break

    case 'rotate':
      if (!domain) {
        console.error('Error: domain is required')
        process.exit(1)
      }
      secretRotate(domain)
      break

    case 'list':
      secretList()
      break

    case 'delete':
      if (!domain) {
        console.error('Error: domain is required')
        process.exit(1)
      }
      secretDelete(domain)
      break

    default:
      console.error(`Unknown subcommand: ${subcommand}`)
      printUsage()
      process.exit(1)
  }
}

main()
