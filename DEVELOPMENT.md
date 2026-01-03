# nicefox-auth Development Guide

Development documentation for the nicefox-auth service and npm package.

## Installation (Development)

```bash
npm install nicefox-auth
```

Peer dependencies:
```bash
npm install express jsonwebtoken
```

## Configuration

### Development (localhost)

For local development, use the hardcoded dev secret:

```env
JWT_SECRET=nicefox-dev-secret-do-not-use-in-production
```

Or use the helper function which auto-detects localhost:

```typescript
import { authMiddleware, getJwtSecret } from 'nicefox-auth'

app.use('/api', authMiddleware({ jwtSecret: getJwtSecret() }))
```

This matches what the auth service uses for `localhost` - no additional setup needed.

### Production

Each deployed app needs its own JWT secret from the auth server:

```bash
# On auth.nicefox.net server, run:
cd /home/auth/nicefox-auth/backend
npx ts-node cli/nicefox-auth-cli.ts secret get compta.nicefox.net
```

Add the returned secret to your app's `.env`:

```env
JWT_SECRET=<secret-from-auth-server>
```

## API Reference (Full)

### authMiddleware(options)

Verifies JWT from `Authorization: Bearer` header. Returns 401 if missing or invalid.

```typescript
app.use('/api', authMiddleware({
  jwtSecret: process.env.JWT_SECRET!,
  
  // Optional: custom handler for unauthorized requests
  onUnauthorized: (req, res) => {
    res.status(401).json({ error: 'Please log in' })
  }
}))
```

After middleware runs, `req.authUser` is available:

```typescript
interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}
```

### optionalAuthMiddleware(options)

Same as `authMiddleware` but doesn't fail if no token present. Use for routes that work for both authenticated and anonymous users.

```typescript
app.use('/api/public', optionalAuthMiddleware({ 
  jwtSecret: process.env.JWT_SECRET! 
}))

app.get('/api/public/posts', (req, res) => {
  if (req.authUser) {
    // Show personalized content
  } else {
    // Show public content
  }
})
```

### requireAdmin()

Middleware that checks for admin role. Must be used after `authMiddleware`.

```typescript
app.get('/api/admin/users', requireAdmin(), (req, res) => {
  // Only admins reach here
})
```

### getLoginUrl(redirectUrl?)

Builds login URL with optional redirect.

```typescript
import { getLoginUrl } from 'nicefox-auth'

const loginUrl = getLoginUrl('https://compta.nicefox.net/dashboard')
// => https://auth.nicefox.net/login?redirect=https%3A%2F%2Fcompta.nicefox.net%2Fdashboard
```

### verifyToken(token, secret)

Low-level JWT verification. Returns payload or `null`.

```typescript
import { verifyToken } from 'nicefox-auth'

const payload = verifyToken(token, process.env.JWT_SECRET!)
if (payload) {
  console.log(payload.userId, payload.email, payload.role)
}
```

## Types

```typescript
import type { AuthUser, TokenPayload, AuthMiddlewareOptions } from 'nicefox-auth'

interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}

interface TokenPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

interface AuthMiddlewareOptions {
  jwtSecret: string
  onUnauthorized?: (req: Request, res: Response) => void
}
```

## CLI Commands

Manage per-app JWT secrets on the auth server:

```bash
# Run from backend/ directory
cd backend

# Get or create secret for a domain (prints to stdout)
npx ts-node cli/nicefox-auth-cli.ts secret get compta.nicefox.net

# Rotate (regenerate) a secret
npx ts-node cli/nicefox-auth-cli.ts secret rotate compta.nicefox.net

# List all configured domains
npx ts-node cli/nicefox-auth-cli.ts secret list

# Delete a secret
npx ts-node cli/nicefox-auth-cli.ts secret delete compta.nicefox.net
```

## Per-App JWT Secrets

Each deployed app gets its own JWT secret, stored as a file on the auth server:

```
/var/lib/nicefox-auth/secrets/
├── compta.nicefox.net
├── app2.nicefox.net
└── auth.nicefox.net
```

### Local Development

For `localhost`, a hardcoded secret is used automatically - no configuration needed.

### Deploy Integration

The `nicefox-deploy` tool should:
1. SSH to auth server as `nicefox-auth` user
2. Run: `npx ts-node cli/nicefox-auth-cli.ts secret get <domain>`
3. Write the returned secret to the app's `.env` as `JWT_SECRET`

## License

MIT
