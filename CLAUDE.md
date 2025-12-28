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
- Shared JWT secret across all apps
- Per-app logout (doesn't clear shared cookie)
- Global roles: `user` | `admin`

## Environment

Copy `.env.example` to `.env` in backend folder. Requires:
- GraphDB connection (URL, project, API key)
- Google OAuth credentials (see SPEC.md for setup instructions)
- JWT secret (shared with all client apps)

## See Also

- `SPEC.md` - Full implementation plan and Google OAuth setup
