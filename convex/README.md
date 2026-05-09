# Locus Activation Authority (Convex)

This folder contains the minimal v1 activation authority for Locus:

- one `licenses` table
- one activation HTTP route: `POST /activate`
- one admin seed route: `POST /admin/upsert-license`

## Required Convex environment variables

- `LOCUS_CONVEX_SHARED_SECRET`: bearer secret used by the Locus client when calling `/activate`
- `LOCUS_CONVEX_ADMIN_KEY`: bearer secret used for admin token seeding
- `LOCUS_LICENSE_PRIVATE_KEY_PKCS8_BASE64`: Ed25519 private key in PKCS8 base64 format

## License payload signing contract

Canonical message:

```text
token + "\n" + user_id + "\n" + device_id + "\n" + expires_at
```

The returned `signature` is Ed25519 over that canonical message.

## Admin seed example

```bash
curl -X POST "$CONVEX_SITE_URL/admin/upsert-license" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $LOCUS_CONVEX_ADMIN_KEY" \
  -d '{
    "token": "EXAM-X92K-AB81",
    "userId": "user_204",
    "status": "unused",
    "deviceId": null,
    "expiresAt": 1789492800000
  }'
```

`expiresAt` is a Unix timestamp in milliseconds.
