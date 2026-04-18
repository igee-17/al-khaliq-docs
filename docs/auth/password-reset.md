---
sidebar_position: 6
---

# Forgot / reset password

Two-step flow: request a code, then consume it with the new password.

## POST /auth/forgot-password

Always returns 202, regardless of whether the email exists. No enumeration.

**Rate limit:** 3 / minute per IP.

### Request

```json
{ "email": "alice@example.com" }
```

### Response — 202 Accepted

```json
{ "message": "If the email is valid, a reset code has been sent." }
```

If the email is real and the account was registered with a password (not Google/Apple only), a 6-digit code is emailed. If the account is OAuth-only, no email is sent — but the response is the same.

---

## POST /auth/reset-password

Consume the code, set a new password, revoke **all** existing refresh tokens for the user.

**Rate limit:** 10 / minute per IP.

### Request

```json
{
  "email": "alice@example.com",
  "code": "654321",
  "newPassword": "MyNewStrongPass2"
}
```

**Rules:**
- `code` — exactly 6 digits, string.
- `newPassword` — 8–72 chars, must contain at least one letter and one number.

### Response — 204 No Content

No body. The user is logged out of every device; they must log in again with the new password.

### Edge cases

| Case | Status | Message |
|---|---|---|
| Wrong code | `400 Bad Request` | `"Invalid reset code"` — attempts counted; 5 wrong → code invalidated. |
| Expired code | `400 Bad Request` | Codes expire after 30 minutes. |
| Unknown email | `400 Bad Request` | `"Invalid reset code"` (same message — no enumeration). |
| OAuth-only account | `400 Bad Request` | `"Invalid reset code"` (account has no password to reset). |
| `newPassword` fails rules | `400 Bad Request` | Field-level errors. |

## Recommended UX

1. Forgot-password screen: email input → POST `/auth/forgot-password` → always show "Check your email" success.
2. Reset-password screen: code input + new password input → POST `/auth/reset-password`.
3. On success: show "Password changed, please sign in" → navigate to login.

Because a successful reset revokes all refresh tokens, the user must re-authenticate on every device — **do not** reuse any cached tokens after reset.
