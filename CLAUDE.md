# nicefox-auth

Central authentication service for `*.nicefox.net` apps.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Bootstrap 5
- **Backend**: Express + TypeScript + NiceFox GraphDB
- **Auth**: Google OAuth + JWT (token in URL, Bearer header)

## Commands

```bash
# Start development
cd frontend && npm run dev    # Port 5175
cd backend && npm run dev     # Port 3200

# Type checking
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

## Project Structure

```
src/                # npm package (published as nicefox-auth)
├── index.ts        # Main export
├── middleware.ts   # Express auth middleware
├── jwt.ts          # JWT verification
└── types.ts        # AuthUser, TokenPayload

frontend/src/
├── pages/          # Login, Users (admin)
├── services/       # API calls (axios)
├── contexts/       # AuthContext
├── components/     # ProtectedRoute
└── types/          # TypeScript interfaces

backend/src/
├── routes/         # auth.ts, users.ts
├── services/       # auth.ts, user.ts, jwtSecrets.ts
├── db/             # graphdb.ts, userQueries.ts
├── middleware/     # auth.ts (JWT verify, admin check)
├── cli/            # nicefox-auth-cli.ts (secret management)
└── types/          # TypeScript interfaces
```

## npm Package

The `src/` folder is published to npm as `nicefox-auth`. Client apps install it instead of copying files:

```bash
npm install nicefox-auth
```

```typescript
import { authMiddleware, requireAdmin, getLoginUrl } from 'nicefox-auth'
import type { AuthUser, TokenPayload } from 'nicefox-auth'

app.use('/api', authMiddleware({ jwtSecret: process.env.JWT_SECRET }))
```

### Publishing

```bash
npm version patch  # or minor/major
npm publish
```

## Key Concepts

- `Auth_User` nodes in GraphDB
- Client apps create local user nodes linked via `authUserId`
- **Per-app JWT secrets** - each app has its own secret, stored in `JWT_SECRETS_DIR/<domain>`
- **Token-based auth** - JWT passed via `Authorization: Bearer` header (no cookies)
- **Token in URL** - after OAuth, user is redirected with `?token=xxx`
- **Client-side logout** - just clear localStorage and redirect to `/`
- Global roles: `user` | `admin`

## Per-App JWT Secrets

Each deployed app gets its own JWT secret, stored as a file on the auth server:

```
/var/lib/nicefox-auth/secrets/
├── compta.nicefox.net
├── app2.nicefox.net
└── auth.nicefox.net
```

### CLI Usage

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

### Local Development

For `localhost`, a hardcoded secret is used automatically - no configuration needed.

### Deploy Integration

Use `nicefox-deploy` to get secrets:

```bash
cd nicefox-deploy
./scripts/auth-secret.sh compta.nicefox.net
```

This SSHs to the auth server and runs the CLI to get/create the secret.

## Environment

Copy `.env.example` to `.env` in backend folder. Requires:
- GraphDB connection (URL, project, API key)
- Google OAuth credentials (see SPEC.md for setup instructions)
- `JWT_SECRETS_DIR` - directory for per-app secrets (default: `/var/lib/nicefox-auth/secrets`)

## See Also

- `DEPLOY.md` - How to deploy nicefox-auth itself
- `ADD-PROJECT.md` - How to add a new app with NiceFox SSO
- `SPEC.md` - Full implementation plan and Google OAuth setup
- `DEVELOPMENT.md` - npm package API reference
