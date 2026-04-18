---
sidebar_position: 1
---

# Email signup + verification

Two steps: sign up, then verify the email. Tokens are issued only on verify — signup does **not** return a usable session.

## POST /auth/signup

Create an unverified account and email a 6-digit verification code.

**Rate limit:** 5 requests / minute per IP.

### Request

```json
{
  "email": "alice@example.com",
  "password": "MyStrongPass1",
  "name": "Alice"
}
```

**Rules:**
- `email` — valid email format. Normalised to lowercase server-side.
- `password` — 8–72 chars, must contain at least one letter and one number.
- `name` — optional, up to 120 chars.

### Response — 202 Accepted

```json
{
  "message": "Verification code sent. Check your email.",
  "email": "alice@example.com"
}
```

### Edge cases

| Case | Status | Behaviour |
|---|---|---|
| Email already registered AND verified | `409 Conflict` | `"An account with this email already exists"` — offer login instead. |
| Email already registered but NOT verified | `202 Accepted` | Silently reissues a fresh code. If a name or password was passed, updates them. |
| Password fails rules | `400 Bad Request` | `message: string[]` with one item per failing rule. |
| Missing email or password | `400 Bad Request` | Field-level validation errors. |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"MyStrongPass1","name":"Alice"}'
```

---

## POST /auth/verify-email

Consume the code, mark the email verified, and return a token pair.

**Rate limit:** 10 / minute per IP.

### Request

```json
{
  "email": "alice@example.com",
  "code": "123456"
}
```

**Rules:**
- `email` — the email the code was sent to.
- `code` — exactly 6 digits, string (not number).

### Response — 200 OK

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

The user is now fully signed in — store the tokens and navigate into the app.

### Edge cases

| Case | Status | Behaviour |
|---|---|---|
| Wrong code | `400 Bad Request` | Attempts are counted; after 5 attempts on the same code, it's invalidated — request a new one. |
| Code expired | `400 Bad Request` | Codes expire after 15 minutes. Call `/auth/resend-verification`. |
| Email already verified | `400 Bad Request` | `"Email is already verified"`. Redirect to login. |
| Unknown email | `400 Bad Request` | `"No pending verification for this email"`. |
| `code` sent as a number (e.g. `123456` not `"123456"`) | `400 Bad Request` | Validation rejects non-string codes. |

---

## POST /auth/resend-verification

Invalidate any prior code for the email and email a new one.

**Rate limit:** 3 / minute per IP.

### Request

```json
{ "email": "alice@example.com" }
```

### Response — 202 Accepted

```json
{ "message": "If the email is valid and unverified, a code has been sent." }
```

Always returns 202, regardless of whether the email exists or is already verified. This prevents attackers from probing for registered accounts.

### curl

```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-verification \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com"}'
```

---

## Recommended UX

- Show a 6-digit code input screen immediately after `/auth/signup` returns 202.
- Include a **"Resend code"** button behind a 30-second cooldown (matches the rate limit).
- Show attempts-remaining hint after the 2nd wrong attempt. After 5 wrong attempts the user must request a new code.
