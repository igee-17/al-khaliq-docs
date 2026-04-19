---
sidebar_position: 6
---

# Audit log

A running log of credential-sensitive actions on the user's own account. Useful for:

- In-app "Recent account activity" screens.
- Support triage ("when did you change your password?").
- Giving the user a paper trail when something looks off.

Only actions the account owner performs are logged. Admin actions are tracked separately (not exposed on this endpoint).

## GET /me/audit-log

Paginated list of this user's audit rows, most recent first.

**Requires:** Bearer.

### Query params

| Name | Default | Notes |
|---|---|---|
| `page` | `1` | integer, min 1 |
| `limit` | `20` | integer, max 100 |

### Response — 200 OK

```json
{
  "items": [
    {
      "id": 17,
      "action": "EMAIL_CHANGED",
      "createdAt": "2026-04-19T10:31:00.333Z",
      "metadata": { "oldEmail": "old@example.com", "newEmail": "new@example.com" }
    },
    {
      "id": 16,
      "action": "PASSWORD_CHANGED",
      "createdAt": "2026-04-18T22:10:00.000Z",
      "metadata": null
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### Action types

| `action` | When fired | Metadata |
|---|---|---|
| `PASSWORD_CHANGED` | successful change-password | `null` |
| `EMAIL_CHANGE_REQUESTED` | successful change-email/request | `{ newEmail }` |
| `EMAIL_CHANGED` | successful change-email/confirm | `{ oldEmail, newEmail }` |
| `PROFILE_DELETED` | successful DELETE /me/profile | `null` |
| `AVATAR_CHANGED` | successful avatar confirm | `{ oldAvatarKey, newAvatarKey }` |
| `AVATAR_DELETED` | successful DELETE /me/avatar | `{ oldAvatarKey }` |

Every row also includes `ipAddress` and `userAgent` server-side, but those aren't returned on this endpoint today — they're for backend / support debugging via direct DB access.

### curl

```bash
curl 'http://localhost:3000/api/v1/me/audit-log?page=1&limit=20' \
  -H 'Authorization: Bearer <accessToken>'
```

### UX recommendation

Render under "Account > Recent activity". Map each action to a human label:

| Action | Label |
|---|---|
| `PASSWORD_CHANGED` | "Password changed" |
| `EMAIL_CHANGE_REQUESTED` | "Email change requested (→ \{newEmail\})" |
| `EMAIL_CHANGED` | "Email changed to \{newEmail\}" |
| `PROFILE_DELETED` | Not shown (the account is gone by the time you'd read this) |
| `AVATAR_CHANGED` | "Profile picture updated" |
| `AVATAR_DELETED` | "Profile picture removed" |

If the user sees an entry they don't remember, prompt them to change their password — their account may be compromised.
