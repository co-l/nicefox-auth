# nicefox-auth

Central authentication service for `*.nicefox.net` apps.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Bootstrap 5
- **Backend**: Express + TypeScript + NiceFox GraphDB
- **Auth**: Google OAuth + JWT (httpOnly cookie on .nicefox.net)

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
frontend/src/
├── pages/          # Login, Users (admin)
├── services/       # API calls (axios)
├── contexts/       # AuthContext
├── components/     # ProtectedRoute
└── types/          # TypeScript interfaces

backend/src/
├── routes/         # auth.ts, users.ts
├── services/       # auth.ts, user.ts
├── db/             # graphdb.ts, userQueries.ts
├── middleware/     # auth.ts (JWT verify, admin check)
└── types/          # TypeScript interfaces

shared/             # Copy to client apps
├── middleware.ts   # Express auth middleware
├── jwt.ts          # JWT verification
└── types.ts        # AuthUser, TokenPayload
```

## Key Concepts

- `Auth_User` nodes in GraphDB
- Client apps create local user nodes linked via `authUserId`
- **Per-app JWT secrets** - each app has its own secret, stored in `JWT_SECRETS_DIR/<domain>`
- Per-app logout (doesn't clear shared cookie)
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

The `nicefox-deploy` tool should:
1. SSH to auth server as `nicefox-auth` user
2. Run: `npx ts-node cli/nicefox-auth-cli.ts secret get <domain>`
3. Write the returned secret to the app's `.env` as `JWT_SECRET`

## Environment

Copy `.env.example` to `.env` in backend folder. Requires:
- GraphDB connection (URL, project, API key)
- Google OAuth credentials (see SPEC.md for setup instructions)
- `JWT_SECRETS_DIR` - directory for per-app secrets (default: `/var/lib/nicefox-auth/secrets`)

## See Also

- `SPEC.md` - Full implementation plan and Google OAuth setup
