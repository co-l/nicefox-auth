# Deploy nicefox-auth

Debian 13 VPS with Neo4j pre-installed.

## 1. Create auth user

```bash
sudo useradd -m -s /bin/bash auth
sudo passwd auth
sudo usermod -aG sudo auth
su - auth
```

## 2. Install nvm & Node

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

## 3. Install pm2

```bash
npm install -g pm2
```

## 4. Clone & build

```bash
cd ~
git clone <repo-url> nicefox-auth
cd nicefox-auth

# Backend
cd backend
npm ci
npm run build

# Frontend
cd ../frontend
npm ci
npm run build
```

## 5. Configure backend

```bash
cd ~/nicefox-auth/backend
cp .env.example .env
nano .env
```

```env
PORT=3001
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<neo4j-password>
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
COOKIE_DOMAIN=.nicefox.net
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_REDIRECT_URI=https://auth.nicefox.net/api/auth/google/callback
```

## 6. Start backend with pm2

```bash
cd ~/nicefox-auth/backend
pm2 start dist/index.js --name nicefox-auth
pm2 save
pm2 startup  # follow instructions to enable on boot
```

## 7. Configure nginx

```bash
sudo nano /etc/nginx/sites-available/auth.nicefox.net
```

```nginx
server {
    listen 80;
    server_name auth.nicefox.net;

    root /home/auth/nicefox-auth/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/auth.nicefox.net /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL with certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d auth.nicefox.net
```

## 9. Verify

```bash
pm2 status
curl -I https://auth.nicefox.net
curl https://auth.nicefox.net/api/auth/me
```

## Updates

```bash
cd ~/nicefox-auth
git pull
cd backend && npm ci && npm run build && pm2 restart nicefox-auth
cd ../frontend && npm ci && npm run build
```
