# DevClaw DigitalOcean Deployment Guide

This document outlines the end-to-end process for deploying DevClaw to a DigitalOcean Droplet, moving away from Cloudflare Tunnels, and configuring the necessary environments.

## 1. Initial Droplet Configuration & Prerequisites

Before deploying, ensure your DigitalOcean Droplet has the base requirements. The current deployment targets:
- **Droplet IP:** `104.248.173.95`
- **User:** `root`
- **Directory:** `/var/www/devclaw`

**Prerequisites on the Droplet:**
- Node.js and npm must be installed on the Droplet.
- SSH access from your deploy machine to the Droplet requires your SSH keys to be authorized (e.g., added to `~/.ssh/authorized_keys` on the Droplet).

*Note: The automatic deployment script handles installing `pm2` and `turbo` globally on the server if they are not already present.*

## 2. Environment Configurations

To correctly shift away from Cloudflare tunneling, establish direct communication using the Droplet IP.

### Bot Applications
Since the bots are now deployed alongside your backend services on the Droplet via PM2, their Gateway URL should point to localhost.
Update **`apps/telegram-bot/.env`** and **`apps/whatsapp-bot/.env`** on the Droplet (or before deploying):
```env
# Point to the local Gateway running in PM2
GATEWAY_URL=http://localhost:3001/api/ingress/message

# The public URL of the Gateway so bots can generate correct auth links
PUBLIC_URL=http://104.248.173.95:3001
```

### Droplet Services (Backend-Side)
On the Droplet, update **`services/openclaw-gateway/.env`** to point to the local bots and connect to the local orchestrator:

```env
# Connect to the local PM2 Orchestrator
ORCHESTRATOR_URL=http://localhost:3010

# Bots are now running on PM2 on the same Droplet
TELEGRAM_BOT_URL=http://localhost:3002
WHATSAPP_BOT_URL=http://localhost:3003
```
*(Other internal routing URLs like `OPENCLAW_ENGINE_URL` can remain as `http://localhost:<port>` since `pm2` runs all backend services cooperatively on the same Droplet).*

### GitHub OAuth App Settings
Because the Gateway URL has fundamentally changed, GitHub must be updated with the new callback location.
Go to **GitHub Developer Settings -> OAuth Apps -> Your App**:
- **Homepage URL**: `http://104.248.173.95:3001`
- **Authorization callback URL**: `http://104.248.173.95:3001/api/auth/github/callback`

## 3. Deploying New Builds

Whenever you have new changes locally that you want to deploy to your Droplet, use the included deployment script (`deploy.sh`).

### How the Deployment Script Works
The `deploy.sh` script automates the full CI/CD loop from your local machine:
1. **Prepare:** Ensures the target directory (`/var/www/devclaw`) exists via SSH.
2. **Transfer:** Uses `rsync` to sync your local files to the Droplet, automatically excluding `node_modules`, `.git`, and build caches to drastically save bandwidth.
3. **Build & Run:** SSHs into the Droplet to fresh install dependencies via `npm install`, compile the services using `npm run build:servers`, and gracefully restarts all nodes utilizing `pm2 startOrReload ecosystem.config.js --update-env`.

### Deployment Steps
From the root of your project directory, simply run:

```bash
chmod +x deploy.sh
./deploy.sh
```

### Post-Deployment Monitoring & Finalizing Bot Setup
To verify that everything successfully deployed and is running without exceptions, you can remote into your server and inspect PM2:

```bash
# SSH into the server
ssh root@104.248.173.95

# List all running PM2 services (Orchestrator, Gateway, Engine, Agent Runner)
pm2 status

# Tail the combined logs for all services
pm2 logs
```

#### WhatsApp Bot First-Time Setup
If this is your first time deploying the WhatsApp bot to this server, you **must link your device via QR Code**. The bot will appear "online" in PM2, but it will be paused in the background waiting for a scan.

To complete the setup:
1. SSH into the server using `ssh root@104.248.173.95`.
2. View the explicit output of the WhatsApp bot by running:
   ```bash
   pm2 logs whatsapp-bot --lines 100
   ```
3. A large QR code will render in your terminal output.
4. Open WhatsApp on your phone, go to **Settings -> Linked Devices -> Link a Device**, and scan the QR code on your screen.
5. The bot will automatically authenticate, save its session data to the Droplet, and begin processing messages. You only need to do this step once.
