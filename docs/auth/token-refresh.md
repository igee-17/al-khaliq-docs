---
sidebar_position: 5
---

# Tokens, refresh, and logout

## Token model

- **Access token** — JWT, HS256. TTL 15 minutes. Sent on every authenticated request as `Authorization: Bearer <accessToken>`.
- **Refresh token** — opaque random string. TTL 30 days. Used **only** to obtain a new access+refresh pair.

Both are returned together from every auth endpoint (`/auth/verify-email`, `/auth/login`, `/auth/google`, `/auth/apple`, `/auth/refresh`).

Store the refresh token in secure device storage (Keychain on iOS, EncryptedSharedPreferences / Keystore on Android). The access token can live in memory — it's short-lived anyway.

## POST /auth/refresh

Rotate: swap an old refresh token for a fresh access + refresh pair.

**Rate limit:** 30 / minute per IP.

### Request

```json
{ "refreshToken": "k9p8V4w…" }
```

### Response — 200 OK

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs…",
  "refreshToken": "n3Q4f…",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 2592000
}
```

The **old refresh token is revoked** server-side the moment it's consumed. A single refresh token can only be used once.

### Edge cases

| Case | Status | What it means |
|---|---|---|
| Unknown / garbage refresh token | `401 Unauthorized` | Clear local tokens, send user to sign-in. |
| Expired refresh token | `401 Unauthorized` | Same — session is over. |
| Already-used refresh token (replay) | `401 Unauthorized` | Someone else refreshed first (or you double-called). Clear tokens; consider showing a "signed in elsewhere" message. |
| Account deactivated / deleted | `401 Unauthorized` | Same handling. |

### Single-flight pattern

If your app fires multiple concurrent requests when the access token expires, only call `/auth/refresh` **once**. Queue the others until it resolves, then retry them with the new access token.

Pseudocode:

```ts
let refreshInFlight: Promise<Tokens> | null = null;

async function refreshOnce(): Promise<Tokens> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: storedRefresh }),
    }).then(async (r) => {
      if (!r.ok) throw new Error('refresh failed');
      return r.json();
    });
    refreshInFlight.finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
```

---

## POST /auth/logout

Revoke the refresh token server-side. Access token is NOT revoked but expires within 15 minutes.

**Requires:** Bearer.

### Request

```json
{ "refreshToken": "k9p8V4w…" }
```

### Response — 204 No Content

No body.

### Client behaviour

1. Call `/auth/logout`.
2. On any response (even an error), discard both tokens locally.
3. Clear any cached data (playlists, recently played, queue).
4. Navigate back to sign-in.

If the network call fails, still clear local state — the refresh token will expire naturally.

---

## GET /auth/me

Current user profile.

**Requires:** Bearer.

### Response — 200 OK

```json
{
  "id": 42,
  "email": "alice@example.com",
  "name": "Alice",
  "avatarUrl": null,
  "isEmailVerified": true,
  "primaryProvider": "EMAIL",
  "createdAt": "2026-04-18T14:22:01.333Z"
}
```

### Typical use

- App cold-start, if you have a cached access token: call `/auth/me` to validate the session and refresh user info.
- On 401: try `/auth/refresh`; on success, retry; on second 401, force sign-in.

---

## Session termination (not a single endpoint)

A user can be signed out globally in these cases:

- They hit `/auth/logout` → that specific refresh token revoked; other devices remain logged in.
- They successfully reset their password via `/auth/reset-password` → **all** refresh tokens revoked; every signed-in device is forced to re-auth.
- Admin deactivates them (not yet built as a public endpoint) → similar effect.

Design your UI to tolerate a sudden 401 on any authenticated call — fall through to refresh + retry, then to sign-in.
