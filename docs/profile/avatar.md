---
sidebar_position: 4
---

# Avatar upload

Two-step flow, same pattern as admin song uploads:

1. **`POST /me/avatar/upload-url`** — client gets a presigned S3 URL.
2. Client PUTs the image bytes to that URL.
3. **`POST /me/avatar/confirm`** — backend HEADs the object, size-checks it, tags it, and sets `user.avatarKey`.

Replacing or removing an avatar is covered below.

## POST /me/avatar/upload-url

**Requires:** Bearer.

### Request

```json
{ "contentType": "image/jpeg" }
```

Allowed content types: `image/jpeg`, `image/png`, `image/webp`.

### Response — 200 OK

```json
{
  "uploadUrl": "https://al-khaliq-media.s3.amazonaws.com/images/users/42/9a7f1c.jpg?X-Amz-...",
  "avatarKey": "images/users/42/9a7f1c.jpg",
  "requiredHeaders": { "Content-Type": "image/jpeg" },
  "expiresAt": "2026-04-19T10:46:00.000Z"
}
```

### Rules

- Server generates the key. Clients never choose it — this protects against IDOR.
- Key pattern is always `images/users/{yourUserId}/{randomHex}.{ext}`.
- Upload URL expires per `UPLOAD_URL_TTL_SEC` (default 15 min).

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/avatar/upload-url \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"contentType":"image/jpeg"}'
```

### Client PUT

```bash
curl -X PUT '<uploadUrl>' \
  -H 'Content-Type: image/jpeg' \
  --data-binary @/path/to/avatar.jpg
```

---

## POST /me/avatar/confirm

**Requires:** Bearer.

### Request

```json
{ "avatarKey": "images/users/42/9a7f1c.jpg" }
```

### Response — 200 OK

Full `ProfileResponseDto` with the new `avatarKey`.

### What the backend checks

1. **Prefix check** — the `avatarKey` must begin with `images/users/{yourUserId}/`. Sending someone else's key → **403**.
2. **HEAD the S3 object** — if it doesn't exist (client never completed the PUT, or uploaded to the wrong URL) → **400**.
3. **Size check** — if `ContentLength > 5 MB`, the oversize object is deleted and the request → **400**.
4. **Tag the object** with `lifecycle=permanent` so the S3 lifecycle rule (which sweeps orphaned uploads after 24 h) won't delete it.
5. If the user had a previous `avatarKey`, that object is deleted from S3.
6. An `AccountAuditLog` row with action `AVATAR_CHANGED` is written (metadata: `{ oldAvatarKey, newAvatarKey }`).

### Edge cases

| Case | Status |
|---|---|
| Key doesn't start with `images/users/{yourUserId}/` | `403` |
| S3 object missing (upload never completed) | `400` |
| Object larger than 5 MB | `400` (and the object is deleted) |
| `avatarKey` missing or > 200 chars | `400` |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/avatar/confirm \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"avatarKey":"images/users/42/9a7f1c.jpg"}'
```

---

## DELETE /me/avatar

Removes the user's avatar — clears `avatarKey`, deletes the S3 object. Idempotent (returns 200 even if no avatar was set).

**Note:** this does NOT clear `avatarUrl`. That field is the OAuth-provided picture (from Google/Apple) and is kept as a fallback. To clear both, the client simply prefers `avatarKey` when rendering.

**Requires:** Bearer.

### Response — 200 OK

Full `ProfileResponseDto` with `avatarKey: null`.

### curl

```bash
curl -X DELETE http://localhost:3000/api/v1/me/avatar \
  -H 'Authorization: Bearer <accessToken>'
```

---

## Rendering rule (client)

```
effectiveAvatar = user.avatarKey
  ? resolveFromMediaCdn(user.avatarKey)
  : user.avatarUrl ?? renderInitials(user.name, user.email)
```

## Orphan cleanup

If a client calls `upload-url` and never `confirm`, the S3 object is untagged. An S3 lifecycle rule on the `images/users/` prefix expires untagged objects after 24 h. No client work required — just don't block on the cron cleaning up your test uploads.
