---
sidebar_position: 3
---

# Errors

Every 4xx / 5xx response uses **exactly one shape**. Build your error-handling UI against this contract.

## The shape

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "email must be an email",
  "timestamp": "2026-04-18T14:22:01.333Z",
  "path": "/api/v1/auth/signup"
}
```

- `statusCode` — HTTP status as a number (same as the response status line).
- `error` — short reason phrase (e.g. `Bad Request`, `UnauthorizedException`).
- `message` — human-readable, safe to surface to end users.
  - **String** for almost every error.
  - **`string[]`** only when the request failed `ValidationPipe` — one item per failing field.
- `timestamp` — ISO 8601 UTC.
- `path` — the request path that produced the error.

No stack traces, no internal field names, no Prisma details. Safe to log verbatim and safe to show in UI (after localisation if needed).

## Status codes you'll see

| Status | Meaning | Typical causes |
|---|---|---|
| `400 Bad Request` | Validation failed or malformed request | Missing required field, wrong type (string where number expected), extra undeclared field, unknown foreign-key id |
| `401 Unauthorized` | No bearer or token is invalid / expired | Missing `Authorization`, expired access token, revoked refresh token |
| `403 Forbidden` | Token valid, but not allowed | User trying to hit admin route; admin with `mustChangePassword=true` hitting any non-change-password endpoint; song unpublished on `/stream` |
| `404 Not Found` | Resource doesn't exist or isn't visible to this user | Unknown id, unpublished song on public endpoints |
| `409 Conflict` | Uniqueness or state conflict | Email already registered; duplicate slug; song currently `PROCESSING` during re-upload |
| `429 Too Many Requests` | Rate limit exceeded | Hit the throttler (see [Intro → Rate limiting](./#rate-limiting)) |
| `500 Internal Server Error` | Unexpected server-side failure | Prisma validation error, infra down. Log + retry with backoff. |

## Handling validation errors (400 with `message: string[]`)

`ValidationPipe` returns one error per failing field. Example — `POST /auth/signup` with an empty body:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "email must be an email",
    "password must contain a letter",
    "password must be shorter than or equal to 72 characters",
    "password must be longer than or equal to 8 characters",
    "password must be a string"
  ],
  "timestamp": "2026-04-18T14:22:01.333Z",
  "path": "/api/v1/auth/signup"
}
```

Your form UI can surface each message next to the corresponding field. The prefix before " " is the field name in almost every case.

## 401 vs 403 — which should trigger a re-login?

- `401` — token problem. Try `POST /auth/refresh` once; on success, retry the original request. If refresh also returns 401, the refresh token is invalid (expired, revoked, or replayed) — **force the user back to sign-in**.
- `403` — you're authenticated but not authorised for this action. **Do not** attempt refresh. Surface a permission / "please change your password" message instead.

## Retries

- `429` — respect the rate limit. Back off and retry after a short delay (the throttler window is 60 seconds by default).
- `500` — transient; retry with exponential backoff (e.g. 500ms → 1s → 2s) with jitter, up to 3 attempts.
- Any other 4xx — **do not retry automatically**. These indicate a client-side bug or a deliberate rejection.

## No-enumeration endpoints

Some endpoints intentionally return `202 Accepted` or `401 Unauthorized` regardless of whether the account exists. Don't expose "user not found" UX for:

- `POST /auth/forgot-password` (always 202)
- `POST /auth/resend-verification` (always 202)
- `POST /auth/login` (401 for both wrong password and non-existent email)

This prevents attackers from harvesting valid email addresses.
