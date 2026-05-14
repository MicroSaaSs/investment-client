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

Browser users can authenticate either with email/password or with Google Sign-In.
For Google browser login, set `VITE_GOOGLE_CLIENT_ID` to your Google Web client ID.

## Run

```bash
npm install
npm run dev
```

## Deploy

GitHub Pages deploy runs automatically from `.github/workflows/deploy-pages.yml` on every push to `main`.

The production build uses:

```bash
.env.production
```

For project Pages, Vite is built with the repo base path automatically.
