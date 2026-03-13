# Docker & Cloudflare Tunnel Setup

This guide explains how to run the `openclaw-gateway` service using Docker and expose it securely using a Cloudflare Tunnel for local development and testing (e.g., receiving webhooks).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running.
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually included with Docker Desktop).
- A valid `.env` file in the `services/openclaw-gateway` directory, configured with necessary environment variables (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Running the Services

The provided `docker-compose.yml` file defines two services:
1. **gateway**: The Node.js application (`openclaw-gateway`) built via `Dockerfile`.
2. **cloudflared**: A Cloudflare Tunnel client that runs alongside the gateway and securely exposes it to the internet without needing to open any local ports.

To build and start both services in the background, run the following command from the `services/openclaw-gateway` directory:

```bash
docker-compose up -d --build
```

### Stopping the Services

To stop and remove the containers, run:

```bash
docker-compose down
```

## Obtaining the Tunnel URL

The `cloudflared` container requests a temporary, random Cloudflare Tunnel URL (e.g., `https://random-words.trycloudflare.com`). 

To find this URL, you need to check the logs of the `cloudflared` container:

```bash
docker-compose logs cloudflared
```

Look for the following log output block:

```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://sunglasses-illustration-sql-cornwall.trycloudflare.com                            |
+--------------------------------------------------------------------------------------------+
```

You can now use this securely generated `https` URL to access your local gateway service from anywhere on the internet (useful for testing external webhooks like Telegram or GitHub).

> **Note:** Because this is a quick temporary tunnel, the URL will change every time you restart the `cloudflared` container.

## Troubleshooting

- **Build Failures:** If `docker-compose up -d --build` fails, ensure you have ran `npm install` locally to let the builder cache dependencies properly.
- **Service Not Reachable:** Make sure the `gateway` container is running without errors by checking its logs: `docker-compose logs gateway`.

- **Restart cloudflared container:**
```bash
# Restart the cloudflared container
docker-compose restart cloudflared
```