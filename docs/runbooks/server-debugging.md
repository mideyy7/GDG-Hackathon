# Server Debugging (DigitalOcean Droplet)

This runbook is for production debugging on the DevClaw droplet (`root@104.248.173.95`) where services run with PM2.

## 1) SSH and Basic Health Check

```bash
ssh root@104.248.173.95
cd /var/www/devclaw
pm2 status
pm2 monit
```

What to look for:

1. Any app in `errored` or `stopped` state.
2. High restart counts.
3. Spiking CPU/memory in `pm2 monit`.

## 2) Live Logs

### All services

```bash
pm2 logs
```

### Specific service (last 200 lines + follow)

```bash
pm2 logs openclaw-gateway --lines 200
pm2 logs orchestrator --lines 200
pm2 logs openclaw-engine --lines 200
pm2 logs agent-runner --lines 200
pm2 logs telegram-bot --lines 200
pm2 logs whatsapp-bot --lines 200
```

### Error logs only

```bash
tail -f ~/.pm2/logs/*-error.log
```

## 3) Deep Inspection for One Service

```bash
pm2 describe openclaw-gateway
```

Use `pm2 describe <service-name>` to inspect:

1. Script path and cwd.
2. Environment values loaded by PM2.
3. Restart history and uptime.
4. Last exit code/signal.

## 4) Fast Recovery Commands

### Restart one service

```bash
pm2 restart openclaw-gateway --update-env
```

### Reload all services from ecosystem file

```bash
cd /var/www/devclaw
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
```

### Verify port exposure for gateway

```bash
ufw status
ss -lntp | grep 3001
```

## 5) Build/Deploy Related Failures

If logs show missing modules, dist files, or config drift:

```bash
cd /var/www/devclaw
npm install
npm run build:servers
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
```

## 6) WhatsApp Bot First-Time QR Setup

If `whatsapp-bot` is online but not processing messages:

```bash
pm2 logs whatsapp-bot --lines 100
```

Scan the QR in terminal using WhatsApp: **Settings -> Linked Devices -> Link a Device**.

## 7) One-Command Incident Snapshot

Run this and share output when asking for help:

```bash
echo '=== PM2 STATUS ===' && pm2 status && \
echo '\n=== PM2 LIST JSON ===' && pm2 jlist | head -c 12000 && \
echo '\n=== LAST ERROR LOGS ===' && tail -n 200 ~/.pm2/logs/*-error.log
```

## 8) Common Patterns and Likely Causes

1. `Cannot find module .../dist/...` -> Build not run or wrong deploy artifact.
2. `EADDRINUSE` -> Port conflict (another process bound to service port).
3. Repeating restarts with no logs -> Crash very early; check `pm2 describe` + error logs.
4. Bot starts but no events -> Wrong `.env` URL wiring or auth/session issue.
5. Gateway reachable but callbacks fail -> OAuth callback URL mismatch.
