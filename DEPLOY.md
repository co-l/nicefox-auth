# Deploy nicefox-auth

Deploy the central authentication service to auth.nicefox.net.

## Prerequisites

- nicefox-deploy repository cloned locally
- VPS already set up with `./scripts/setup-vps.sh`
- Google OAuth credentials (see below)

## 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `https://auth.nicefox.net/api/auth/google/callback`
7. Save the **Client ID** and **Client Secret**

## 2. Deploy with nicefox-deploy

```bash
cd nicefox-deploy

# Add the project (if not already done)
./scripts/add-project.sh nicefox-auth
# -> Add the deploy key to GitHub

# First deployment
./scripts/init.sh nicefox-auth
```

## 3. Configure Environment Variables

```bash
./scripts/env.sh nicefox-auth edit
```

Add the following:

```env
PORT=<auto-assigned>
NODE_ENV=production

# GraphDB
GRAPHDB_URL=https://graphdb.nicefox.net
GRAPHDB_PROJECT=<project-name>
GRAPHDB_API_KEY=<api-key>

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_CALLBACK_URL=https://auth.nicefox.net/api/auth/google/callback

# Frontend URL (for redirects)
FRONTEND_URL=https://auth.nicefox.net

# JWT Secrets Directory
JWT_SECRETS_DIR=/var/lib/nicefox-auth/secrets
```

## 4. Create JWT Secrets Directory

SSH to the VPS and create the secrets directory:

```bash
ssh debian@nicefox.net

# Create directory with proper permissions
sudo mkdir -p /var/lib/nicefox-auth/secrets
sudo chown deployer:deployer /var/lib/nicefox-auth/secrets
sudo chmod 700 /var/lib/nicefox-auth/secrets
```

## 5. Restart the Service

```bash
./scripts/deploy.sh nicefox-auth
```

## 6. Verify

```bash
# Check if running
ssh debian@nicefox.net
sudo -u deployer bash -c 'source ~/.nvm/nvm.sh && pm2 status'

# Test the endpoint
curl https://auth.nicefox.net/api/auth/me
# Should return: {"error":"Authentication required"}
```

## Updating

```bash
cd nicefox-deploy
./scripts/deploy.sh nicefox-auth
```

## Logs

```bash
./scripts/logs.sh nicefox-auth
```

## Auth CLI

The auth service includes a CLI for managing per-app JWT secrets. It runs on the VPS:

```bash
ssh debian@nicefox.net
cd /opt/apps/nicefox-auth/backend
npx tsx cli/nicefox-auth-cli.ts secret list
npx tsx cli/nicefox-auth-cli.ts secret get compta.nicefox.net
```

See [ADD-PROJECT.md](./ADD-PROJECT.md) for how to integrate new apps.
