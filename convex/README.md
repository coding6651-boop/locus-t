# Locus Activation Authority (Convex)

This directory contains the Convex backend for Locus — a serverless activation authority that manages license tokens and admin authentication.

## Tables

### `licenses`

License tokens created by administrators and consumed by the Locus CLI.

| Field | Type | Description |
|---|---|---|
| `token` | `string` | Unique token code (e.g. `LIVE-ABCD-1234`) |
| `fullName` | `string?` | Human-readable name for the licensee |
| `userId` | `string` | Internal user identifier |
| `status` | `"unused" \| "activated" \| "expired" \| "revoked"` | Current lifecycle state |
| `deviceId` | `string?` | Device fingerprint bound on first activation |
| `maxUses` | `number?` | Maximum number of activations allowed |
| `usedCount` | `number?` | How many times this token has been activated |
| `expiresAt` | `number` | Unix timestamp (ms) after which the token is expired |
| `activatedAt` | `number?` | Timestamp of first successful activation |
| `createdAt` | `number` | Timestamp of record creation |

**Indexes:** `by_token` (unique lookup), `by_status` (status filtering)

### `admins`

Administrators who log into the web-based admin panel.

| Field | Type | Description |
|---|---|---|
| `email` | `string` | Login email (unique) |
| `passwordHash` | `string` | SHA-256 hash of the password |
| `name` | `string` | Display name |
| `createdAt` | `number` | Timestamp of account creation |

**Indexes:** `by_email` (unique lookup)

## Functions

### Queries (public)

| Function | Args | Returns | Description |
|---|---|---|---|
| `getAdminByEmail` | `{ email }` | `{ email, name } \| null` | Look up an admin by email |
| `getAllLicenses` | `{}` | `Doc<"licenses">[]` | List all license tokens (max 100) |

### Mutations (public)

| Function | Args | Returns | Description |
|---|---|---|---|
| `login` | `{ email, password }` | `{ success, email?, name? } \| { success, error }` | Authenticate an admin |
| `createLicenseToken` | `{ fullName?, expiresAt, maxUses? }` | `{ success, token? }` | Create a new license token (auto-generates userId) |
| `initDefaultAdmin` | `{}` | `{ success, message }` | Seed the default admin account |

### Mutations (internal — called only by HTTP routes)

| Function | Args | Returns | Description |
|---|---|---|---|
| `activateToken` | `{ token, deviceId, now }` | ActivationSuccess \| ActivationError | Activate a token: validates state, binds device, increments usage |
| `createToken` | `{ fullName, userId, expiresAt, maxUses, now }` | `{ ok, token }` | Insert a new license token |
| `upsertLicense` | Full license fields | `{ ok, token }` | Insert or update a license record |

## HTTP Routes

All routes are defined in `http.ts` and return JSON responses.

### `POST /activate`

Activate a license token. Called by the Locus CLI.

**Auth:** Bearer `LOCUS_CONVEX_SHARED_SECRET`

**Request:**
```json
{ "token": "LIVE-ABCD-1234", "device_id": "XXXX-XXXX-XXXX" }
```

**Success response (200):**
```json
{
  "token": "LIVE-ABCD-1234",
  "user_id": "user_ABCD1234",
  "device_id": "XXXX-XXXX-XXXX",
  "expires_at": "2026-12-31T23:59:59.000Z",
  "signature": "<Ed25519 signature>"
}
```

**Error responses:**

| Status | Code | Condition |
|---|---|---|
| 400 | `invalid_request` | Missing `token` or `device_id` |
| 401 | `internal_error` | Unauthorized (bad or missing Bearer token) |
| 403 | `token_revoked` | Token has been revoked |
| 403 | `token_exhausted` | Token has reached max activation limit |
| 404 | `token_not_found` | Token does not exist |
| 410 | `token_expired` | Token is past its expiry |
| 500 | `internal_error` | Private key not configured or signing failure |

### `POST /admin/create-token`

Create a new license token.

**Auth:** Bearer `LOCUS_CONVEX_ADMIN_KEY`

**Request:**
```json
{ "fullName": "John Doe", "userId": "user_204", "expiresAt": 1789492800000, "maxUses": 1 }
```

**Response (200):** `{ "ok": true, "token": "LIVE-ABCD-1234" }`

### `POST /admin/upsert-license`

Insert or update a license record. Creates if `token` doesn't exist, patches if it does.

**Auth:** Bearer `LOCUS_CONVEX_ADMIN_KEY`

**Request:**
```json
{
  "token": "LIVE-ABCD-1234",
  "fullName": "John Doe",
  "userId": "user_204",
  "status": "activated",
  "deviceId": "XXXX-XXXX-XXXX",
  "maxUses": 1,
  "usedCount": 1,
  "expiresAt": 1789492800000
}
```

**Response (200):** `{ "ok": true, "token": "LIVE-ABCD-1234" }`

### `POST /api/getAllLicenses`

Retrieve all license tokens.

**Auth:** Bearer `LOCUS_CONVEX_ADMIN_KEY`

**Response (200):** Array of license records.

## License Payload Signing Contract

The CLI verifies the activation response using an embedded Ed25519 public key.

**Canonical message:**
```
<token>\n<user_id>\n<device_id>\n<expires_at>
```

The returned `signature` is an Ed25519 signature over that message, produced using the private key in `LOCUS_LICENSE_PRIVATE_KEY_PKCS8_BASE64`.

The CLI extracts each field from the response, reconstructs the canonical message, and calls `crypto.subtle.verify` with the embedded public key.

## Required Environment Variables

These must be set on the Convex deployment (via `npx convex env set` or the Convex dashboard):

| Variable | Purpose |
|---|---|
| `LOCUS_CONVEX_SHARED_SECRET` | Bearer secret used by the Locus CLI when calling `/activate` |
| `LOCUS_CONVEX_ADMIN_KEY` | Bearer secret used by the admin panel and admin HTTP API |
| `LOCUS_LICENSE_PRIVATE_KEY_PKCS8_BASE64` | Ed25519 private key in PKCS8 base64 format for signing license payloads |

## Deployment

```bash
# From the project root
npx convex deploy
```

To seed the default admin account after deployment:

```bash
npx convex run --prod admins:initDefaultAdmin
```

Default credentials: `admin@locus.dev` / `admin123`

## Local Development

```bash
# Start the Convex dev server (auto-watches convex/ directory)
npx convex dev

# Run a function locally
npx convex run admins:getAdminByEmail --args '{ "email": "admin@locus.dev" }'

# Open the Convex dashboard
npx convex dashboard
```
