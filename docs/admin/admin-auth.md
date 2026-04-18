---
sidebar_position: 1
---

# Admin auth

Admins live in a **separate table** from mobile users. Different token namespace, different login endpoint, different refresh table.

Roles:

| Role | Can |
|---|---|
| `SUPER_ADMIN` | Manage other admins + everything a CONTENT_ADMIN can do. |
| `CONTENT_ADMIN` | CRUD artists, albums, genres, songs; upload media; publish. |

## POST /admin/auth/login

**Rate limit:** 10 / minute per IP.

### Request

```json
{ "email": "admin@example.com", "password": "StrongPass1" }
```

### Response — 200 OK

```json
{
  "admin": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Jane Admin",
    "role": "SUPER_ADMIN",
    "isActive": true,
    "mustChangePassword": false,
    "lastLoginAt": "2026-04-18T14:22:01.333Z",
    "createdAt": "2026-04-18T14:22:01.333Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs…",
    "refreshToken": "k9p8V4w…",
    "accessTokenExpiresIn": 900,
    "refreshTokenExpiresIn": 2592000
  }
}
```

### `mustChangePassword = true`?

Every admin created through `POST /admin/admins` starts with `mustChangePassword: true`. On first login, **every endpoint returns 403** except:

- `POST /admin/auth/change-password`
- `POST /admin/auth/logout`
- `GET /admin/auth/me` (actually also blocked — only `change-password` + `logout` are allowed in this state)

Route the user to a forced-password-change screen immediately on first login.

### Edge cases

| Case | Status | Behaviour |
|---|---|---|
| Wrong password | `401 Unauthorized` | `"Invalid email or password"` |
| Deactivated admin (`isActive=false`) | `401 Unauthorized` | Same message (no enumeration). |
| Unknown email | `401 Unauthorized` | Same message. |

---

## POST /admin/auth/refresh

Same behaviour as user refresh. Rotates the refresh token; old one is revoked.

```json
{ "refreshToken": "k9p8V4w…" }
```

Returns `AdminAuthTokensDto` (no `admin` object — call `/admin/auth/me` if you need it).

---

## POST /admin/auth/logout

**Requires:** admin Bearer.

```json
{ "refreshToken": "k9p8V4w…" }
```

Response: `204 No Content`.

---

## GET /admin/auth/me

Current admin profile. Requires Bearer.

Response: `AdminResponseDto` (same shape as the `admin` object in the login response).

---

## POST /admin/auth/change-password

Change your own password. Clears `mustChangePassword`. Revokes **all** existing refresh tokens for this admin.

**Requires:** admin Bearer (allowed even when `mustChangePassword=true`).

### Request

```json
{
  "currentPassword": "TempPass1",
  "newPassword": "MyRealStrongPass2"
}
```

### Rules

- `newPassword` — 8–72 chars, ≥1 letter, ≥1 number.
- Must differ from `currentPassword`.

### Response — 204 No Content

All refresh tokens for this admin are revoked. **The admin must log in again** — their client should re-run `POST /admin/auth/login` with the new password right after the change-password call.

### Edge cases

| Case | Status | Message |
|---|---|---|
| Wrong `currentPassword` | `400 Bad Request` | `"currentPassword is incorrect"` |
| `newPassword === currentPassword` | `400 Bad Request` | `"newPassword must differ from currentPassword"` |
| `newPassword` weak | `400 Bad Request` | Field-level errors |

## No forgot-password for admins

There is no `/admin/auth/forgot-password`. If an admin loses access, a SUPER_ADMIN resets their password via `POST /admin/admins/:id/reset-password` (see [Admin users](./admin-users.md)).
