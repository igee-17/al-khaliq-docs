# User auth

Mobile-first. Three sign-in methods: email + password, Google, Apple. JWT access + rotating refresh.

## Endpoints (all under `/api/v1/auth`)

| Method | Path | Notes |
|---|---|---|
| POST | `/signup` | email + password → emails a 6-digit code. Does **not** return tokens. |
| POST | `/verify-email` | consumes the code, marks email verified, **returns tokens** — user is now signed in. |
| POST | `/resend-verification` | new code. Always 202 (no enumeration). |
| POST | `/login` | email + password → tokens. 401 if unverified. |
| POST | `/google` | `{ idToken }` from Google Sign-In SDK → verify against Google JWKS → tokens. |
| POST | `/apple` | `{ identityToken, name? }` from SIWA → verify against Apple JWKS → tokens. |
| POST | `/refresh` | rotate refresh token. |
| POST | `/logout` | revoke the current refresh token (Bearer required). |
| POST | `/forgot-password` | email code. Always 202. |
| POST | `/reset-password` | `{ email, code, newPassword }` — revokes all existing refresh tokens. |
| GET | `/me` | current user profile. |

## Key behaviours

- **Signup never returns tokens.** They're issued only from `/verify-email`, `/login`, `/google`, `/apple`, and `/refresh`.
- **Apple's `name` is only sent on first authorisation**, per Apple's spec — the mobile client must forward it then.
- **`/login` against an unverified email returns 401**, not 400 — avoids enumeration.
- **Rate limits** are per-endpoint tighter than the global ttl/limit. See `src/auth/auth.controller.ts`.

## Tokens

Covered in [Tokens](./tokens.md).
