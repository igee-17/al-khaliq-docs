---
sidebar_position: 3
---

# Change email

Two-step flow:
1. **Request** — user types the new email; we send a 6-digit code to the **new** address to prove ownership.
2. **Confirm** — user pastes the code; we flip the email and notify the **old** address.

This keeps the current email authoritative until the new one is proven.

## POST /me/profile/change-email/request

**Requires:** Bearer.

**Rate-limited:** 3 requests / 60 seconds per IP.

### Request

```json
{
  "newEmail": "new@example.com",
  "currentPassword": "Password1"
}
```

### Response — 204 No Content

- A 6-digit code is generated, hashed, and stored server-side with a TTL of `EMAIL_VERIFICATION_TTL_MIN` (default 15 minutes).
- The plaintext code is emailed to `newEmail`.
- Any prior pending email-change request for this user is auto-invalidated (only the latest pending code is consumable).
- An `AccountAuditLog` row with action `EMAIL_CHANGE_REQUESTED` is written (metadata: `{ newEmail }`).

### Edge cases

| Case | Status |
|---|---|
| Wrong `currentPassword` | `401` |
| `newEmail` equals current (case-insensitive) | `400` |
| `newEmail` already in use by another user | `409` |
| Malformed email | `400` |
| OAuth-only user (no password to verify) | `403` |
| Rate limit exceeded | `429` |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/profile/change-email/request \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"newEmail":"new@example.com","currentPassword":"Password1"}'
```

---

## POST /me/profile/change-email/confirm

**Requires:** Bearer.

**Rate-limited:** 10 requests / 60 seconds per IP.

### Request

```json
{ "code": "123456" }
```

### Response — 204 No Content

### What happens on success

1. `user.email` is updated (lowercased) and `isEmailVerified` set to `true`.
2. **Every refresh token is revoked** (same as password change — other devices must re-login).
3. The **old** email receives an informational "Your email was changed" notice (best-effort; failures log but don't reject the request).
4. An `AccountAuditLog` row with action `EMAIL_CHANGED` is written (metadata: `{ oldEmail, newEmail }`).

### Edge cases

| Case | Status |
|---|---|
| No active pending request for this user | `400` |
| Wrong code | `400` (attempts counter increments) |
| 5th wrong attempt | `400` — request is invalidated; user must request a new code |
| Expired code | `400` |
| Consumed code reused | `400` |
| **Race: someone else signed up with `newEmail` between request and confirm** | `409` — original email is preserved |
| Rate limit exceeded | `429` |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/profile/change-email/confirm \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"code":"123456"}'
```

---

## Client UX notes

- After `request`, dump the user onto a 6-digit code screen the same as email verification on signup.
- If the user navigates away and comes back, they can re-call `request` — only the latest code is consumable, so old codes the user may have screenshotted are safe (they'll error out).
- On `confirm` success, force a re-login — refresh tokens are gone, so the app's persisted session is dead on arrival anyway.
- The notice email to the old address is informational. If the user's account was compromised, it's the first signal they'll get. Don't suppress it.
