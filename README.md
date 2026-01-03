# nicefox-auth

Add NiceFox SSO to your app in 5 minutes.

## How It Works

1. User visits your app → not logged in
2. Redirect to `auth.nicefox.net/login`
3. User logs in with Google
4. Redirected back with `?token=xxx`
5. Store token, call `/api/me` to verify → logged in

## Backend (Express)

### Install

```bash
npm install nicefox-auth
```

### Protect Your Routes

```typescript
import express from 'express'
import { authMiddleware } from 'nicefox-auth'

const app = express()

app.use('/api', authMiddleware({ 
  jwtSecret: process.env.JWT_SECRET 
}))

app.get('/api/me', (req, res) => {
  res.json(req.authUser)
  // { id: "abc123", email: "user@example.com", role: "user" }
})
```

Clients send the token via `Authorization: Bearer <token>` header.

### JWT Secret

| Environment | JWT_SECRET |
|-------------|------------|
| Development | `nicefox-dev-secret-do-not-use-in-production` |
| Production  | Provided by nicefox-deploy |

Or use the helper that auto-detects localhost:

```typescript
import { authMiddleware, getJwtSecret } from 'nicefox-auth'

app.use('/api', authMiddleware({ jwtSecret: getJwtSecret() }))
```

## Frontend (React)

### Auth Hook

```tsx
// hooks/useAuth.ts
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
      // Clean URL
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

```tsx
const { getToken } = useAuth()

async function fetchData() {
  const res = await fetch('/api/data', {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  return res.json()
}
```

## API Reference

### `authMiddleware(options)`

Verifies JWT from `Authorization: Bearer` header. Returns 401 if missing/invalid.

```typescript
interface AuthMiddlewareOptions {
  jwtSecret: string
  onUnauthorized?: (req, res) => void  // Custom 401 handler
}
```

After middleware: `req.authUser = { id, email, role }`

### `optionalAuthMiddleware(options)`

Same but allows anonymous access. `req.authUser` is `undefined` if no token.

### `getLoginUrl(redirectUrl?)`

```typescript
import { getLoginUrl } from 'nicefox-auth'

getLoginUrl('https://myapp.nicefox.net/dashboard')
// => https://auth.nicefox.net/login?redirect=https%3A%2F%2Fmyapp.nicefox.net%2Fdashboard
```

## Types

```typescript
interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}
```

## License

MIT
