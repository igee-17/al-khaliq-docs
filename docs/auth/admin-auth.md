# Admin auth

Admin accounts are **completely separate** from end-user accounts — a different Prisma model (`AdminUser`), a different refresh token table (`AdminRefreshToken`), a different JWT payload, and a different passport strategy.

## Why a separate table

- Different capabilities (CRUD the catalog) and different threat model (fewer accounts, higher privilege).
- Keeping them apart prevents bugs where a scoped admin query forgets its `userId` filter and leaks cross-tenant data.
- Admins never sign up, never go through email verification, and never use Google / Apple.

## Roles

```
SUPER_ADMIN     - can create and manage other admins
CONTENT_ADMIN   - can CRUD catalog (artists, albums, songs, genres) + upload media
```

## Endpoints (all under `/api/v1/admin/auth`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/login` | public | email + password → `{ admin, tokens }` |
| POST | `/refresh` | public | rotate refresh token |
| POST | `/logout` | admin | revoke current refresh token |
| GET | `/me` | admin | current admin profile |
| POST | `/change-password` | admin | clears `mustChangePassword`, revokes all refresh tokens |

## `mustChangePassword`

Every admin created by a `SUPER_ADMIN` starts with `mustChangePassword: true`. A middleware (applied by `AdminJwtAuthGuard`) short-circuits every non-`/change-password` request to 403 while this flag is true. Only the CLI-seeded initial super-admin starts with it `false` (they chose their password on the CLI).

## Admin management (`/api/v1/admin/admins`, SUPER_ADMIN only)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | list admins |
| POST | `/` | create admin `{ email, name, role, tempPassword }` |
| PATCH | `/:id` | update role / `isActive` |
| POST | `/:id/reset-password` | force reset (returns a new temp password) |
