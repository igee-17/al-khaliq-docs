---
sidebar_position: 2
---

# Change password

For logged-in users changing their own password while they still remember the current one. Forgot-password uses a separate [reset flow](../auth/password-reset.md).

## POST /me/profile/change-password

**Requires:** Bearer.

**Rate-limited:** 5 requests / 60 seconds per IP.

### Request

```json
{
  "currentPassword": "OldPassword1",
  "newPassword": "NewPassword1"
}
```

### Response — 204 No Content

No body.

### What happens on success

1. Password hash is updated.
2. **Every refresh token for this user is revoked** — any other device using a refresh token will fail its next refresh with 401. They have to log in again.
3. The current access token is **NOT invalidated**. It continues to work until its natural expiry (default 15 minutes). Practical impact: on other logged-in devices, the user may still be able to call read endpoints for up to 15 min before the next refresh fails. The mobile client should handle this by proactively forcing a re-login when the password-change screen is dismissed.
4. An `AccountAuditLog` row is written with action `PASSWORD_CHANGED`.

### Edge cases

| Case | Status |
|---|---|
| Wrong current password | `401` |
| New password same as current | `400` |
| New password shorter than 8 chars | `400` |
| Account has no password set (Google / Apple sign-in only) | `403` |
| Rate limit exceeded (6th in 60s) | `429` |

### OAuth-only accounts

Accounts created via Google or Apple sign-in have no password hash. They get `403` on this endpoint. "Set a password on an OAuth-only account" is not in scope for v1.

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/profile/change-password \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"currentPassword":"OldPassword1","newPassword":"NewPassword1"}'
```
