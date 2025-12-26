# nicefox-auth Integration

Copy `shared/` folder to your project.

## Setup

```bash
npm install jsonwebtoken cookie-parser
npm install -D @types/jsonwebtoken @types/cookie-parser
```

```typescript
import express from 'express'
import cookieParser from 'cookie-parser'
import { authMiddleware, requireAdmin, optionalAuthMiddleware, getLoginUrl } from './shared/middleware'

const app = express()
app.use(cookieParser())

const JWT_SECRET = process.env.JWT_SECRET // Same secret as nicefox-auth
const AUTH_URL = 'https://auth.nicefox.net'
```

## Protect Routes

```typescript
// Require auth
app.use('/api', authMiddleware({ jwtSecret: JWT_SECRET }))

// Access user in handlers
app.get('/api/profile', (req, res) => {
  res.json({ user: req.authUser }) // { id, email, role }
})

// Require admin
app.get('/api/admin', requireAdmin(), (req, res) => {
  res.json({ admin: true })
})

// Optional auth (works for guests too)
app.get('/api/public', optionalAuthMiddleware({ jwtSecret: JWT_SECRET }), (req, res) => {
  res.json({ user: req.authUser || null })
})
```

## Redirect to Login

```typescript
app.use('/api', authMiddleware({
  jwtSecret: JWT_SECRET,
  onUnauthorized: (req, res) => {
    res.redirect(getLoginUrl(AUTH_URL, `https://myapp.nicefox.net${req.originalUrl}`))
  }
}))
```

## Link Local User

```typescript
// Create/link local user on first API call
app.use('/api', authMiddleware({ jwtSecret: JWT_SECRET }), async (req, res, next) => {
  let localUser = await db.findUserByAuthId(req.authUser.id)
  if (!localUser) {
    localUser = await db.createUser({ authUserId: req.authUser.id, email: req.authUser.email })
  }
  req.localUser = localUser
  next()
})
```

## Types

```typescript
interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}
```
