---
sidebar_position: 2
---

# Admin users management

SUPER_ADMIN-only. Use these to onboard CONTENT_ADMINs, deactivate former ones, and issue temporary passwords.

All endpoints require an **admin Bearer** with role `SUPER_ADMIN`. A CONTENT_ADMIN hitting any of these gets `403 Forbidden`.

## GET /admin/admins

List all admins (including SUPER_ADMINs). Paginated.

### Query

- `?page=` — default 1.
- `?limit=` — default 20, max 100.

### Response — 200 OK

```json
{
  "items": [
    {
      "id": 1,
      "email": "admin@example.com",
      "name": "Jane Admin",
      "role": "SUPER_ADMIN",
      "isActive": true,
      "mustChangePassword": false,
      "lastLoginAt": "2026-04-18T14:22:01.333Z",
      "createdAt": "2026-04-18T14:22:01.333Z"
    }
  ],
  "total": 4,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

## POST /admin/admins

Create a new admin. The new admin starts with `mustChangePassword: true` and must change it on first login.

### Request

```json
{
  "email": "content@example.com",
  "tempPassword": "Temp1234!",
  "role": "CONTENT_ADMIN",
  "name": "Content Admin"
}
```

**Rules:**
- `tempPassword` — 8–72 chars, ≥1 letter, ≥1 number. Hand it to the new admin out-of-band (Slack DM, password manager).
- `role` — `SUPER_ADMIN` or `CONTENT_ADMIN`.

### Response — 201 Created

`AdminResponseDto` for the new admin.

### Edge cases

| Case | Status |
|---|---|
| Email already used by another admin | `409 Conflict` |
| `role` not a valid enum | `400 Bad Request` |
| `tempPassword` weak | `400 Bad Request` |

---

## PATCH /admin/admins/:id

Update role or active flag. Empty body → `400 Bad Request`.

### Request (partial)

```json
{
  "role": "SUPER_ADMIN",
  "isActive": false
}
```

Both fields optional. You can send just one.

### Response — 200 OK

`AdminResponseDto` (updated).

### Guardrails

- **You cannot demote yourself** — changing your own role returns `403 Forbidden`.
- **You cannot deactivate yourself** — returns `403 Forbidden`.
- Deactivating another admin **revokes all their refresh tokens** — they're signed out immediately on every device.

### Edge cases

| Case | Status |
|---|---|
| Unknown id | `404 Not Found` |
| Empty body | `400 Bad Request` |

---

## POST /admin/admins/:id/reset-password

Force-reset another admin's password. Returns a freshly-generated temp password in the response body (one-time — not recoverable).

### Request

Empty body.

### Response — 200 OK

```json
{ "tempPassword": "XvB-9kQp3fW2" }
```

Sets `mustChangePassword: true` on the target admin. Revokes all their refresh tokens.

### Guardrails

- **You cannot reset your own password** — returns `403 Forbidden`. Use `POST /admin/auth/change-password` instead.

### Edge cases

| Case | Status |
|---|---|
| Unknown id | `404 Not Found` |
| Target is yourself | `403 Forbidden` |
