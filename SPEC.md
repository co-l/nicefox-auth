# nicefox-auth - Implementation Plan

## Overview

A self-hosted central authentication service for `*.nicefox.net` apps, providing Google OAuth login, JWT-based sessions, and minimal user management.

## Architecture

```
                              ┌─────────────────────────────────────┐
                              │       auth.nicefox.net              │
                              │                                     │
                              │  ┌───────────┐    ┌──────────────┐  │
                              │  │ Express   │    │ React SPA    │  │
                              │  │ Backend   │    │ /login       │  │
                              │  │           │    │ /admin/users │  │
                              │  └───────────┘    └──────────────┘  │
                              │        │                            │
                              │        ▼                            │
                              │  ┌───────────┐                      │
                              │  │ Neo4j     │                      │
                              │  │ Auth_User │                      │
                              │  └───────────┘                      │
                              └─────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
           │ compta.nice  │   │ app2.nice    │   │ app3.nice    │
           │              │   │              │   │              │
           │ Compta_User  │   │ App2_User    │   │ (no local)   │
           │      │       │   │      │       │   │              │
           │      ▼       │   │      ▼       │   │              │
           │ [:LINKED_TO] │   │ [:LINKED_TO] │   │              │
           │ Auth_User    │   │ Auth_User    │   │              │
           └──────────────┘   └──────────────┘   └──────────────┘
```

## Data Model

### Auth Service (Neo4j)

```cypher
(:Auth_User {
  id: String,           # UUID
  email: String,        # unique, from Google
  googleId: String,     # unique, Google's sub claim
  name: String,
  avatarUrl: String?,
  role: String,         # 'user' | 'admin'
  createdAt: DateTime,
  lastLoginAt: DateTime
})
```

### Client Apps (e.g., Compta)

```cypher
(:Compta_User {
  id: String,           # UUID, app-local
  authUserId: String,   # references Auth_User.id
  # ... app-specific fields
})-[:LINKED_TO]->(:Auth_User)
```

> Note: The `[:LINKED_TO]` relationship is optional - apps can just store `authUserId` and query by it. The relationship is useful if DBs stay shared.

## Auth Flow (Detailed)

### Login Flow

```
1. User visits compta.nicefox.net
2. Frontend checks for JWT cookie (auth_token on .nicefox.net)
3. No cookie → redirect to auth.nicefox.net/login?redirect=https://compta.nicefox.net
4. Auth service shows login page with Google button
5. User clicks → redirect to Google OAuth
6. Google authenticates → redirects to auth.nicefox.net/api/auth/google/callback
7. Auth service:
   - Creates or updates Auth_User
   - Issues JWT (contains: userId, email, role)
   - Sets httpOnly cookie on .nicefox.net domain
   - Redirects to original redirect URL (compta.nicefox.net)
8. Compta frontend reads cookie → user is logged in
```

### Token Verification (in client apps)

```
1. Request comes in with auth_token cookie
2. Middleware verifies JWT using shared secret
3. Extracts userId, email, role from token
4. Looks up or creates local Compta_User linked to authUserId
5. Attaches user to request
```

### Logout Flow (per-app)

```
1. User clicks logout in compta
2. Compta clears its own session/state
3. Does NOT clear the .nicefox.net cookie
4. User is logged out of compta but still has valid token for other apps
```

## Project Structure

```
nicefox-auth/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express entry point
│   │   ├── config.ts             # Environment config
│   │   ├── routes/
│   │   │   ├── auth.ts           # Google OAuth routes
│   │   │   └── users.ts          # Admin user management
│   │   ├── services/
│   │   │   ├── auth.ts           # OAuth logic, JWT issuance
│   │   │   └── user.ts           # User CRUD
│   │   ├── db/
│   │   │   ├── neo4j.ts          # Connection
│   │   │   └── userQueries.ts    # Auth_User queries
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT verification, admin check
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               # Router
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Google login button
│   │   │   └── Users.tsx         # Admin user list
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── shared/                        # Copy to client apps as needed
│   ├── middleware.ts             # Express middleware for client apps
│   ├── jwt.ts                    # JWT verify utility
│   └── types.ts                  # Shared types (AuthUser, TokenPayload)
├── .env.example
├── .gitignore
├── CLAUDE.md
└── README.md
```

## API Endpoints

### Auth Routes (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/google` | Initiates Google OAuth flow |
| GET | `/google/callback` | Google OAuth callback, sets cookie, redirects |
| GET | `/me` | Returns current user from token |
| POST | `/logout` | Clears cookie (optional, for full logout) |

### User Management Routes (`/api/users`) - Admin only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all users |
| GET | `/:id` | Get user by ID |
| PATCH | `/:id` | Update user (role) |
| DELETE | `/:id` | Delete user |

## Frontend Pages

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/login` | Login.tsx | Public | Google sign-in button, redirect param |
| `/users` | Users.tsx | Admin | List users, edit roles, delete |

## Shared Package (`shared/`)

This code is copied to client apps (compta, etc.) to verify tokens and protect routes.

### Exports

```typescript
// middleware.ts
export function authMiddleware(options: { jwtSecret: string }): RequestHandler

// types.ts
export interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}
```

### Usage in Client Apps

```typescript
import { authMiddleware } from './shared/auth/middleware'

app.use('/api', authMiddleware({ jwtSecret: process.env.JWT_SECRET }))
```

## Environment Variables

### Auth Service

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5175
COOKIE_DOMAIN=.nicefox.net        # Use localhost for dev

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# JWT
JWT_SECRET=                        # Shared across all apps
JWT_EXPIRES_IN=7d
```

### Client Apps (e.g., Compta)

```env
# Add to existing .env
AUTH_SERVICE_URL=https://auth.nicefox.net
JWT_SECRET=                        # Same as auth service
```

## Migration Plan for Compta

Once `nicefox-auth` is deployed, compta-claude needs these changes:

### Remove

- `backend/src/routes/auth.ts` (login, register routes)
- `backend/src/services/auth.ts` (password hashing, local JWT)
- `frontend/src/pages/Login.tsx` (replace with redirect)
- `frontend/src/pages/Register.tsx` (delete)
- Local `User` node type (replace with `Compta_User` linked to `Auth_User`)

### Add

- Copy `shared/` folder from nicefox-auth
- New auth middleware using shared code
- Redirect to `auth.nicefox.net/login` when not authenticated
- Create `Compta_User` on first login (linked to `authUserId`)

### Keep

- `AuthContext.tsx` (modify to read from shared cookie)
- `ProtectedRoute.tsx` (works the same)
- All business logic

## Development Workflow

### Local Development

1. Run auth service on `localhost:3001`
2. Run compta on `localhost:5174` (frontend) + `localhost:3000` (backend)
3. Use `/etc/hosts` to create fake subdomains for cookie testing

### Local Hosts Setup

Add to `/etc/hosts`:
```
127.0.0.1 auth.local.nicefox.net
127.0.0.1 compta.local.nicefox.net
```

Then use `.local.nicefox.net` as cookie domain in development.

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| JWT secret exposure | Store in env, never commit |
| CSRF | SameSite=Lax cookie + origin check |
| XSS | httpOnly cookie (JS can't read token) |
| Open redirect | Validate redirect URLs against allowlist |
| Token theft | Short expiry (7d), HTTPS only in prod |

### Redirect URL Validation

```typescript
const ALLOWED_REDIRECT_HOSTS = [
  'compta.nicefox.net',
  'compta.local.nicefox.net',
  // Add new apps here
]

function isValidRedirect(url: string): boolean {
  const parsed = new URL(url)
  return ALLOWED_REDIRECT_HOSTS.includes(parsed.host)
}
```

## Implementation Order

1. **Backend setup** - Express, Neo4j connection, config
2. **Auth routes** - Google OAuth flow, JWT issuance, cookie setting
3. **User queries** - Create/update Auth_User in Neo4j
4. **Frontend login page** - Minimal React app with Google button
5. **Admin routes & UI** - User list, role editing
6. **Shared code** - Extract middleware for client apps
7. **Documentation** - README, CLAUDE.md

## Google OAuth Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown (top-left) → **New Project**
3. Name it `nicefox-auth` (or similar)
4. Click **Create**

### Step 2: Enable the Google People API

1. Go to **APIs & Services** → **Library**
2. Search for "Google People API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Fill in:
   - **App name**: `Nicefox` (or your preference)
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue**
5. **Scopes**: Add these non-sensitive scopes:
   - `openid`
   - `email`
   - `profile`
6. Click **Save and Continue**
7. **Test users**: Add your email(s) for testing (required while app is unverified)
8. Click **Save and Continue**

> **Note**: Your app starts in "Testing" mode with a 100-user limit. Submit for verification later when ready for public use.

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name: `nicefox-auth-web`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3001
   http://auth.local.nicefox.net:3001
   https://auth.nicefox.net
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3001/api/auth/google/callback
   http://auth.local.nicefox.net:3001/api/auth/google/callback
   https://auth.nicefox.net/api/auth/google/callback
   ```
7. Click **Create**
8. Copy **Client ID** and **Client Secret** → save to `.env`

### Step 5: Add Credentials to Environment

```env
GOOGLE_CLIENT_ID=123456789-xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

## Summary

| Item | Decision |
|------|----------|
| Database | Shared Neo4j, `Auth_` prefix, abstracted for future split |
| App-user linking | Local user node (e.g., `Compta_User`) with `authUserId` field + `[:LINKED_TO]` relationship |
| Roles | Global (`user` / `admin`), checked by each app |
| Logout | Per-app only |
| Frontend | React (Vite) |
| Hosting | Same server as compta (not relied upon) |
| Shared code | Copy-paste `shared/` folder to client apps |
