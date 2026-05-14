# investment-client

React + Vite Telegram Mini App client.

## Env

Tracked template:

```bash
.env.example
```

For local development, copy the development template to a real Vite env file:

```bash
cp .env.example .env.development.local
```

When the app is opened outside Telegram in local dev, it falls back to a mock auth payload (`"dev"`), so you can test the web app without a real Telegram user.
Browser users can authenticate either with email/password or with Google Sign-In.
For Google browser login, set `VITE_GOOGLE_CLIENT_ID` to your Google Web client ID.

## Run

```bash
npm install
npm run dev
```
