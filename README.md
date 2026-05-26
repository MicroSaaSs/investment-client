# investment-client

React + Vite investment client for both:

- desktop browser use
- Telegram Mini App use

## Main UX areas

- `Portfolios`: manage portfolios, preview positions, and review overview cards
- `Holdings`: full position table on desktop and compact expandable cards on mobile
- `Watch List`: watchlist entries with peak / avg drawdown defaults shown in the description
- `Risk`: peak + avg drawdown analytics by ticker
- `AI`: Telegram schedule + manual AI summary preview with explicit portfolio selector

The client has separate responsive behavior for desktop and mobile, including:

- mobile top action bar + bottom tab nav
- portfolio preview cards and position detail modals
- compact transaction cards on mobile

## Recent product behavior

- position order is manual and persistent (`displayOrder`) across:
  - portfolio position list
  - holdings table/cards
  - mobile cards
- holdings desktop has column visibility control and manual order controls
- summary metrics picker is shared UX across desktop/mobile with apply flow
- allocation charts use custom external labels with responsive clipping guards
- cash transaction flow supports optional paired buffer transaction:
  - buy from selected CASH bucket
  - sell proceeds to selected CASH bucket
- cash bucket positions are shown as non-model members (allocation target/drift not applicable)

## Environment

Tracked template:

```bash
.env.example
```

For local development:

```bash
cp .env.example .env.development.local
```

Important variables:

- `VITE_API_BASE_URL`: backend base URL
- `VITE_GOOGLE_CLIENT_ID`: Google Web client ID for browser Google Sign-In
- `VITE_BASE_PATH`: optional Pages base path override for production builds

## Local run

```bash
npm install
npm run dev
```

Default local URL:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

## Deploy

GitHub Pages deploy runs from:

```text
.github/workflows/deploy-gh-pages.yml
```

On deploy, the workflow builds the app with:

- `VITE_BASE_PATH=/${repo-name}/`
- production API base URL
- public Google client ID

## Auth behavior

- browser users can sign in with email/password or Google
- Telegram Mini App users can sign in through Telegram auth
- for Telegram users, the client hides the normal logout option
