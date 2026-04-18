---
sidebar_position: 2
---

# Email + password login

## POST /auth/login

Sign in with email and password.

**Rate limit:** 10 / minute per IP.

### Request

```json
{
  "email": "alice@example.com",
  "password": "MyStrongPass1"
}
```

### Response — 200 OK

Same `AuthResponseDto` shape as `/auth/verify-email`:

```json
{
  "user": {
    "id": 42,
    "email": "alice@example.com",
    "name": "Alice",
    "avatarUrl": null,
    "isEmailVerified": true,
    "primaryProvider": "EMAIL",
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

### Edge cases

| Case | Status | Message |
|---|---|---|
| Wrong password | `401 Unauthorized` | `"Invalid email or password"` |
| Unknown email | `401 Unauthorized` | `"Invalid email or password"` (same message to prevent enumeration) |
| Email not verified | `401 Unauthorized` | `"Email is not verified. Check your inbox for a verification code."` — route the user back to the verify-email screen. |
| Missing fields | `400 Bad Request` | Field-level errors |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"MyStrongPass1"}'
```

## Recommended client flow

1. Submit login.
2. On 401 with the generic message → show "Invalid email or password".
3. On 401 with the "not verified" message → navigate to the verify-email screen with the email pre-filled.
4. On 200 → store both tokens, navigate into the app.
