# Locus Admin Panel

Web-based admin panel for managing Locus license tokens and administrators. Built with React + Vite + Tailwind CSS and connected to the same Convex deployment as the Locus activation authority.

## Features

- **Authentication** — Login with email/password (session persisted in `localStorage`)
- **License Management** — View all tokens, filter by status (unused / activated / expired / revoked), create new tokens
- **Token Creation** — Specify full name, expiry date/time, and max uses; auto-generates token code and user ID

## Prerequisites

- Node.js 18+
- A deployed Convex backend (see root `convex/README.md`)
- `.env.local` with Convex deployment URL

## Setup

```bash
# Install dependencies
npm install

# Start the dev server
npx vite
```

Opens at `http://localhost:5173`.

## Default Admin

After deploying the Convex backend, seed the default admin account:

```bash
# From the project root
npx convex run --prod admins:initDefaultAdmin
```

**Credentials:** `admin@locus.dev` / `admin123`

## Building for Production

```bash
npm run build
```

Output goes to `dist/` — a static site ready to deploy to any hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

## Convex Integration

The admin panel uses the same Convex deployment as the Locus CLI. It calls:

- `api.admins.login` — authenticate admin users
- `api.licenses.createLicenseToken` — create new license tokens
- `api.licenses.getAllLicenses` — list all tokens

Update the deployment target in `.env.local`:

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

## Project Structure

```
src/
├── convex/_generated/   # Convex API type stubs (mirrors root convex/)
├── components/          # Reusable UI components
│   ├── CreateTokenModal.tsx
│   ├── Layout.tsx
│   ├── LoginForm.tsx
│   └── TokenTable.tsx
├── hooks/
│   └── useAuth.tsx      # Auth context + provider
├── lib/
│   └── convex.ts        # Convex client re-exports
├── pages/
│   ├── Login.tsx
│   └── Tokens.tsx
├── App.tsx
├── main.tsx
└── index.css            # Tailwind base styles
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_CONVEX_URL` | Yes | Convex deployment URL (e.g. `https://hallowed-turtle-957.convex.cloud`) |

Can also use a `.env.local` file in this directory.
