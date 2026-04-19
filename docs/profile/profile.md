---
sidebar_position: 1
---

# Read & update profile

The single entry point for "who am I" and "let me change my display name". Avatar upload, password change, email change, delete, and audit log have their own pages in this section.

## GET /me/profile

Returns the logged-in user's full profile.

**Requires:** Bearer.

### Response — 200 OK

```json
{
  "id": 42,
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatarKey": "images/users/42/9a7f1c.jpg",
  "avatarUrl": "https://lh3.googleusercontent.com/a/...",
  "isEmailVerified": true,
  "primaryProvider": "EMAIL",
  "createdAt": "2026-01-14T10:22:00.000Z",
  "lastLoginAt": "2026-04-19T09:15:00.000Z"
}
```

### Field notes

- **`avatarKey`** — S3 object key for an avatar the user uploaded through this API. Resolve via your media CDN.
- **`avatarUrl`** — external URL set by Google / Apple sign-in on first login. Survives even after the user sets their own `avatarKey`.
- **Client rule:** prefer `avatarKey` if present; fall back to `avatarUrl`; if both null, render a generated initial or a placeholder.
- **`primaryProvider`** tells you which sign-in flow created the account (`EMAIL` / `GOOGLE` / `APPLE`). The user may still be able to link others later.

### curl

```bash
curl http://localhost:3000/api/v1/me/profile \
  -H 'Authorization: Bearer <accessToken>'
```

---

## PATCH /me/profile

Update editable profile fields. Currently only `name` is editable.

**Requires:** Bearer.

### Request

```json
{ "name": "Jane Doe" }
```

Pass `null` to **clear** the name:

```json
{ "name": null }
```

Omit the field entirely to leave it unchanged.

### Response — 200 OK

Full `ProfileResponseDto` (same shape as GET).

### Rules

- `name` max 100 chars.
- Extra fields in the body → `400`.
- `null` is explicitly allowed (distinct from "field missing").

### Edge cases

| Case | Status |
|---|---|
| Name too long | `400` |
| Unauthorised | `401` |
| Unknown field in body | `400` |

### curl

```bash
curl -X PATCH http://localhost:3000/api/v1/me/profile \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Jane Doe"}'
```

---

## How this relates to `/auth/me`

`GET /auth/me` from the auth surface returns a narrower DTO (no `avatarKey`, no `lastLoginAt`). Treat `/me/profile` as the canonical profile endpoint going forward — `/auth/me` is kept for backwards compatibility.
