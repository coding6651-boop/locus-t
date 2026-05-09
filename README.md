# locus

**Local AI coding terminal** — an offline, LLM-powered coding assistant that runs entirely on your machine.

Locus connects to a local LLM backend (llama.cpp via its OpenAI-compatible API) and gives you an interactive terminal where you can chat, run commands, and manipulate files — all without internet access.

Activation is managed via a Convex-hosted license authority using Ed25519-signed payloads.

---

## Architecture

```
locus/
├── bin/locus.ts              # npm/bin entry point
├── src/
│   ├── cli/                  # Terminal UI (readline-based interactive CLI)
│   ├── core/                 # Brain/orchestration layer
│   ├── ai/                   # AI inference — LLM client abstraction
│   ├── providers/            # Provider abstraction (llama.cpp, etc.)
│   ├── tools/                # Terminal capabilities (bash, files, edit, etc.)
│   ├── memory/               # Conversation & cache management
│   ├── repo/                 # Repository intelligence layer
│   ├── runtime/              # Application lifecycle & startup
│   ├── auth/                 # Licensing system
│   │   ├── types.ts          # LicensePayload, VerifyResult, ActivationResult
│   │   ├── crypto.ts         # Ed25519 signature verification
│   │   ├── device.ts         # Multi-platform device fingerprinting
│   │   ├── storage.ts        # License persistence (~/.locus/license.lic)
│   │   ├── verification.ts   # License verification flow
│   │   └── activation.ts     # Activation flow (POST with retry & signing)
│   ├── config/               # Configuration (defaults, loader, schema)
│   ├── ui/                   # Terminal UI layer
│   ├── modes/                # Offline/online mode switching
│   └── utils/                # Shared utilities
├── convex/                   # Convex backend (activation authority)
│   ├── schema.ts             # Database schema (licenses, admins)
│   ├── licenses.ts           # License mutation/query functions
│   ├── admins.ts             # Admin authentication functions
│   ├── http.ts               # HTTP routes (activate, admin CRUD)
│   └── _generated/           # Auto-generated Convex types
├── packages/
│   └── admin/                # Web-based admin panel (Vite + React)
├── scripts/                  # Setup & packaging
├── storage/                  # Local runtime data (gitignored)
├── models/                   # Local GGUF files (gitignored)
└── assets/                   # Static assets
```

---

## Requirements

- **Node.js** 22+ (Ed25519 via WebCrypto)
- **llama.cpp** running as a server (`llama-server`) with an OpenAI-compatible endpoint
  - Or any OpenAI-compatible API (works with Ollama, vLLM, etc.)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Start llama.cpp server (in another terminal)
llama-server -m path/to/model.gguf --host 127.0.0.1 --port 8080

# 4. Run locus
npm start
```

Dev mode with hot-reload:

```bash
npm run dev
```

---

## License & Activation

Locus requires a valid license token to run. The activation system uses Ed25519 cryptographic signatures verified against a public key embedded in the binary.

### Activation Flow

1. **Generate a license token** via the Admin Panel (or the `/admin/create-token` HTTP API)
2. **Activate the CLI**: `locus activate LIVE-ABCD-1234-EFGH`
3. The CLI sends the token + device fingerprint to the Convex backend
4. The backend validates the token, signs a license payload with the Ed25519 private key
5. The CLI verifies the signature against the embedded public key and stores the license locally at `~/.locus/license.lic`

### CLI License States

| State | Behaviour |
|---|---|
| Licensed | Full functionality — all CLI commands and tools available |
| Unlicensed | Limited mode — only `/activate`, `/help`, and `/exit` available |
| Expired | Token expired — renew via new activation |

### Commands

| Command | Description |
|---|---|
| `/activate <token>` | Activate a license token |
| `/help` | Show available commands |
| `/clear` | Clear the terminal screen |
| `/reset` | Reset the conversation session |
| `/exit` or `/quit` | Exit locus |

In unlicensed mode, only `/activate`, `/help`, and `/exit` are available.

### Env Vars

| Variable | Default | Description |
|---|---|---|
| **LLM Backend** |||
| `LOCUS_BASE_URL` | `http://127.0.0.1:8080/v1` | LLM API endpoint |
| `LOCUS_MODEL` | `qwen2.5-coder-7b-instruct` | Model name |
| `LOCUS_TEMPERATURE` | `0.1` | Sampling temperature |
| `LOCUS_MAX_TOKENS` | `8192` | Max tokens per response |
| **Activation** |||
| `LOCUS_AUTH_URL` | `https://api.locus.ai/v1/activate` | Activation endpoint |
| `LOCUS_CONVEX_URL` | Convex deployment URL | Convex HTTP endpoint |
| `LOCUS_CONVEX_SHARED_SECRET` | — | Bearer token for activation requests |

---

## Convex Backend

The activation authority lives in `convex/` and is deployed to Convex Cloud.

### Tables

**`licenses`** — License tokens and their state:

| Field | Type | Description |
|---|---|---|
| `token` | `string` | Unique token (e.g. `LIVE-ABCD-1234`) |
| `fullName` | `string?` | End-user display name |
| `userId` | `string` | End-user identifier |
| `status` | `"unused" \| "activated" \| "expired" \| "revoked"` | Current state |
| `deviceId` | `string?` | Bound device on activation |
| `maxUses` | `number?` | Max activation count |
| `usedCount` | `number?` | Times activated |
| `expiresAt` | `number` | Expiry timestamp (ms) |
| `activatedAt` | `number?` | First activation timestamp |
| `createdAt` | `number` | Creation timestamp |

Indexes: `by_token`, `by_status`

**`admins`** — Admin panel users:

| Field | Type | Description |
|---|---|---|
| `email` | `string` | Login email |
| `passwordHash` | `string` | SHA-256 password hash |
| `name` | `string` | Display name |
| `createdAt` | `number` | Creation timestamp |

Index: `by_email`

### HTTP Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/activate` | POST | `LOCUS_CONVEX_SHARED_SECRET` | Activate a license token, returns Ed25519-signed payload |
| `/admin/create-token` | POST | `LOCUS_CONVEX_ADMIN_KEY` | Create a new license token |
| `/admin/upsert-license` | POST | `LOCUS_CONVEX_ADMIN_KEY` | Insert or update a license record |
| `/api/getAllLicenses` | POST | `LOCUS_CONVEX_ADMIN_KEY` | List all license tokens |

### Deploy

```bash
npm run convex:deploy
```

Requires these environment variables on the Convex deployment:

| Env Var | Description |
|---|---|
| `LOCUS_CONVEX_SHARED_SECRET` | Bearer secret for CLI activation requests |
| `LOCUS_CONVEX_ADMIN_KEY` | Bearer secret for admin API requests |
| `LOCUS_LICENSE_PRIVATE_KEY_PKCS8_BASE64` | Ed25519 private key for signing license payloads |

See `convex/README.md` for full details.

---

## Admin Panel

A standalone web application at `packages/admin/` for managing license tokens and admin accounts.

### Quick Start

```bash
cd packages/admin
npm install
npx vite
```

Opens at `http://localhost:5173`. Default credentials: `admin@locus.dev` / `admin123`.

### Seed the Default Admin

```bash
npx convex run --prod admins:initDefaultAdmin
```

See `packages/admin/README.md` for full setup.

---

## Configuration

### Config file

Create `locus.config.json` in the project root or `~/.locus/config.json`:

```json
{
  "baseURL": "http://127.0.0.1:8080/v1",
  "model": "qwen2.5-coder-7b-instruct",
  "temperature": 0.1,
  "maxTokens": 8192
}
```

---

## Tools

| Tool | Description |
|---|---|
| `bash` | Execute shell commands in the workspace |
| `read` | Read file contents with line numbers |
| `write` | Write content to a file (creates directories) |
| `edit` | Apply exact string replacements to files |
| `glob` | Search for files matching glob patterns |
| `grep` | Search file contents with regex (uses ripgrep) |
| `git` | Run git operations (status, diff, log, etc.) |

---

## Design Principles

1. **Offline-first** — Everything runs locally, no cloud dependency
2. **Provider abstraction** — Swap LLM backends by implementing `LLMProvider`
3. **Separation of concerns** — AI inference, UI, tools, and config are independent layers
4. **Extensible tools** — Add new capabilities by creating a tool folder and registering it
5. **Graceful degradation** — If the LLM is unreachable, locus explains what to do rather than crashing

---

## Package

```bash
npm pack   # creates locus-0.1.0.tgz
```

## License

MIT
