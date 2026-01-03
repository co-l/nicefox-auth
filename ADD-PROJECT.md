# Add a New Project with NiceFox Auth

How to integrate nicefox-auth SSO into a new `*.nicefox.net` app.

## Overview

1. Get a JWT secret for your domain
2. Add the npm package to your backend
3. Add the auth hook to your frontend
4. Deploy

## 1. Get JWT Secret

From `nicefox-deploy`, run:

```bash
./scripts/auth-secret.sh <domain>
```

This will:
- SSH to auth.nicefox.net
- Run `nicefox-auth-cli secret get <domain>`
- Print the secret

**Save this secret** - you'll add it to your app's `.env` file.

### Manual Method

If the script doesn't exist yet, SSH directly:

```bash
ssh debian@nicefox.net
cd /opt/apps/nicefox-auth/backend
npx tsx cli/nicefox-auth-cli.ts secret get myapp.nicefox.net
```

## 2. Backend Setup

### Install

```bash
npm install nicefox-auth
```

### Protect Routes

```typescript
import express from 'express'
import { authMiddleware } from 'nicefox-auth'

const app = express()

// Protect all /api routes
app.use('/api', authMiddleware({ 
  jwtSecret: process.env.JWT_SECRET 
}))

// Access authenticated user
app.get('/api/me', (req, res) => {
  res.json(req.authUser)
  // { id: "abc123", email: "user@example.com", role: "user" }
})
```

### Environment

Add to your `.env`:

```env
JWT_SECRET=<secret-from-step-1>
```

For local development, use:

```env
JWT_SECRET=nicefox-dev-secret-do-not-use-in-production
```

## 3. Frontend Setup

### Auth Hook

Create `src/hooks/useAuth.ts`:

```tsx
import { useState, useEffect } from 'react'

const TOKEN_KEY = 'auth_token'
const AUTH_URL = 'https://auth.nicefox.net'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for token in URL (returning from auth)
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('token')
    
    if (tokenFromUrl) {
      localStorage.setItem(TOKEN_KEY, tokenFromUrl)
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Verify token with backend
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const login = () => {
    const returnUrl = window.location.href
    window.location.href = `${AUTH_URL}/login?redirect=${encodeURIComponent(returnUrl)}`
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    window.location.href = '/'
  }

  const getToken = () => localStorage.getItem(TOKEN_KEY)

  return { user, loading, login, logout, getToken }
}
```

### Usage

```tsx
function App() {
  const { user, loading, login, logout } = useAuth()

  if (loading) return <p>Loading...</p>
  
  if (!user) {
    return <button onClick={login}>Sign in with Google</button>
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### API Calls

Always include the token in API calls:

```tsx
const { getToken } = useAuth()

async function fetchData() {
  const res = await fetch('/api/data', {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  return res.json()
}
```

## 4. Deploy

### With nicefox-deploy

```bash
cd nicefox-deploy

# Create project config
./scripts/add-project.sh myapp

# Edit projects/myapp.sh if needed

# Set environment variables
./scripts/env.sh myapp edit
# Add: JWT_SECRET=<secret-from-step-1>

# Deploy
./scripts/init.sh myapp
```

### Verify

1. Visit `https://myapp.nicefox.net`
2. Click "Sign in with Google"
3. Should redirect to `auth.nicefox.net`
4. After login, should redirect back with `?token=xxx`
5. Token is stored, user is logged in

## Flow Summary

```
User visits myapp.nicefox.net
    ↓
Not logged in → Click "Sign in"
    ↓
Redirect to auth.nicefox.net/login?redirect=https://myapp.nicefox.net
    ↓
User logs in with Google
    ↓
Redirect to https://myapp.nicefox.net?token=eyJhbG...
    ↓
Frontend stores token in localStorage
    ↓
Frontend calls /api/me with Bearer token
    ↓
Backend verifies JWT with domain-specific secret
    ↓
User is authenticated ✓
```

## Troubleshooting

### "No JWT secret configured for domain"

The auth server doesn't have a secret for your domain. Run:

```bash
ssh debian@nicefox.net
cd /opt/apps/nicefox-auth/backend
npx tsx cli/nicefox-auth-cli.ts secret get myapp.nicefox.net
```

### "Invalid or expired token"

1. Check your `JWT_SECRET` matches the one from the auth server
2. For localhost, use `nicefox-dev-secret-do-not-use-in-production`
3. Token may have expired (7 days by default)

### Token not being saved

Check browser console for errors. The frontend must:
1. Extract `?token=` from URL
2. Save to localStorage
3. Clean the URL
4. Call `/api/me` to verify

### CORS errors

Ensure your backend allows the auth redirect. For Vite dev:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```
