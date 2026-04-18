# Tokens

## Access token (JWT)

- HS256, signed with `JWT_ACCESS_SECRET`.
- TTL: 15 minutes (configurable via `JWT_ACCESS_TTL_SEC`).
- Payload (user): `{ sub: userId, email }`.
- Payload (admin): `{ sub: adminId, role }`.
- Sent by the client as `Authorization: Bearer <token>`.

## Refresh token (opaque, DB-backed)

- 32 random bytes, base64url-encoded. Not a JWT.
- Stored in the DB as `sha256(raw)` in `refresh_tokens.tokenHash` (or `admin_refresh_tokens.tokenHash`).
- The raw token is **returned to the client once**, at issuance.
- TTL: 30 days (configurable via `JWT_REFRESH_TTL_SEC`).

## Rotation on every refresh

`POST /auth/refresh` (or `POST /admin/auth/refresh`):

1. Hash the provided token, look it up.
2. If not found, expired, or already revoked → 401.
3. Mark the existing row `revokedAt = now()`.
4. Issue a new pair: fresh access JWT + fresh refresh token row.
5. Return the new pair.

**A single refresh token is usable exactly once.** Re-using it = 401.

## Logout

- `POST /auth/logout` with Bearer + body `{ refreshToken }` revokes that row. Access token isn't invalidated — it simply expires within 15 minutes.

## Password reset

- `POST /auth/reset-password` revokes **all** existing refresh tokens for the user on success. Any device logged in is forced to re-authenticate.

## Why this design

- Short-lived JWTs keep bearer exposure to 15 min.
- DB-backed refresh makes logout + forced sign-out feasible.
- Rotation detects stolen refresh tokens — a second use of the same token shows up as a 401 and is observable.
