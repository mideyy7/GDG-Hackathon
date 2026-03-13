# DevClaw Ingress Interface

This is a comprehensive guide to the newly added bots and gateway inside the DevClaw Monorepo.

## What Was Added?

We have implemented three new packages:
1. `services/openclaw-gateway`: This is an Express server. It exposes a `POST /api/ingress/message` endpoint, which is the unified entry point for all bot messages.
2. `apps/telegram-bot`: A Telegram bot using `telegraf` that listens to messages and forwards them to the gateway.
3. `apps/whatsapp-bot`: A WhatsApp bot using `whatsapp-web.js` that allows you to scan a QR code via your terminal to log in, and then forwards all received messages to the gateway.

## Testing Locally (End-to-End)

To test the end-to-end incoming path:

### 1. Requirements

- You need a valid Telegram Bot Token. Talk to the BotFather on Telegram to generate one if you don't have it.
- **Node v20+** is recommended. Let's make sure all dependencies are installed at the workspace root:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in both bot directories with the necessary keys:

For **Telegram**:
Create `apps/telegram-bot/.env` containing:
```env
TELEGRAM_BOT_TOKEN="your_token_here"
GATEWAY_URL="http://localhost:3001/api/ingress/message"
```

For **WhatsApp**:
Create `apps/whatsapp-bot/.env` containing:
```env
GATEWAY_URL="http://localhost:3001/api/ingress/message"
```

For the **Gateway** (Optional):
The gateway defaults to port 3001, but you can override it in `services/openclaw-gateway/.env`
```env
PORT=3001
```

### 3. Running the Services

The workspace uses `turbo` so you can spin up everything concurrently in development mode from the root directory:

```bash
npm run dev
```

During startup:
- The `openclaw-gateway` will bind to port 3001 and start logging.
- The `telegram-bot` will announce "[Telegram] Bot started."
- The `whatsapp-bot` will print a QR code in the terminal. Open the *WhatsApp app* on your mobile phone -> Settings -> Linked Devices -> Link a Device, and point your camera at the QR code. Once authenticated, wait for the "[WhatsApp] Client is ready!" log.

### 4. Sending Messages

1. **Telegram**: Message your Telegram bot (e.g., say "Hello").
2. **WhatsApp**: Have a friend message your WhatsApp account (or use a secondary number).

In the terminal running `npm run dev`, you will see:
```text
[Gateway] Received message from telegram: { ... payload details ... }
```
or 
```text
[Gateway] Received message from whatsapp: { ... payload details ... }
```

The user in Telegram or WhatsApp will receive an automated acknowledgment: "Task received and sent to gateway. Evaluating..."

## Running Unit Tests

We have established automated unit tests to prove the baseline health of each new component. You can run all workspace tests simultaneously from the root with:

```bash
npm run test
```

This will run:
- Gateway ingestion and health endpoints
- Telegram bot instantiation routines
- WhatsApp bot instantiation routines
