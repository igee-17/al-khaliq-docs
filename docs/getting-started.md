---
sidebar_position: 2
---

# Getting started

A complete request against the API, from sign-up to a signed stream URL.

## 1. Create an account

Sign up with email and password. The backend stores the user and emails a 6-digit verification code.

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "MyStrongPass1",
  "name": "Alice"
}
```

Response:

```json
{
  "message": "Verification code sent. Check your email.",
  "email": "alice@example.com"
}
```

Status: `202 Accepted`. Signup never returns tokens — you must verify the email first.

## 2. Verify the email

```http
POST /auth/verify-email
Content-Type: application/json

{
  "email": "alice@example.com",
  "code": "123456"
}
```

Response: `200 OK` with tokens — the user is now signed in.

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

## 3. Store the tokens

- **Access token** — JWT, TTL 15 minutes. Send on every authenticated request as `Authorization: Bearer …`.
- **Refresh token** — opaque string, TTL 30 days. Store securely on the device (Keychain on iOS, EncryptedSharedPreferences / Keystore on Android). Never send it to an endpoint other than `/auth/refresh` or `/auth/logout`.

## 4. Call an authenticated endpoint

```http
GET /home/quick-picks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs…
```

Response: up to 20 songs personalised for this user (see [Discovery → Home](./discovery/home.md)).

## 5. Get a streaming URL for a song

```http
GET /songs/42/stream
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "streamUrl": "https://d1234.cloudfront.net/hls/42/main.m3u8?Expires=…&Signature=…&Key-Pair-Id=…",
  "expiresAt": "2026-04-18T14:32:01.333Z",
  "duration": 247
}
```

Pass `streamUrl` directly to the platform player:

- **iOS** — `AVPlayer` / `AVURLAsset` (HLS is native)
- **Android** — `ExoPlayer` with `HlsMediaSource.Factory`
- **Web** — hls.js, or Safari's native HLS support

The URL is valid for 10 minutes. Fetch a fresh one if the user opens the song later.

## 6. Record the play

When playback crosses the 50% threshold, fire one event:

```http
POST /playback/events
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "songId": 42 }
```

Response: `204 No Content`. The backend increments `playCount` once per user/song/day and updates your recently-played feed.

## 7. Refresh the access token when it expires

When your access token hits its 15-minute TTL, any call returns `401 Unauthorized`. Swap it:

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "k9p8V4w…" }
```

Response: a fresh pair. The old refresh token is **revoked** — any reuse returns 401. Store the new pair immediately.

## 8. Log out

```http
POST /auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "refreshToken": "k9p8V4w…" }
```

Response: `204 No Content`. The refresh token is revoked server-side. Discard both tokens on the client.

---

## Recommended client behaviour

- **Interceptor pattern** — wrap your HTTP client so every outbound request injects the access token and every 401 triggers `/auth/refresh` + retry once.
- **Single refresh flight** — if multiple requests 401 at once, only call `/auth/refresh` once and queue the others.
- **Force logout on double 401** — if `/auth/refresh` itself returns 401, the refresh token is invalid. Clear local tokens and send the user back to sign-in.

See [Auth → Token refresh](./auth/token-refresh.md) for the exact logic.
