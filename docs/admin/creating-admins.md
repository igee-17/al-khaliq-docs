# Creating admins

## The first super-admin

There is no public signup flow for admins. The **first super-admin** is created out-of-band via a CLI seed script.

```bash
yarn seed:super-admin --email you@example.com --password 'StrongPass1'
```

The script:

- Refuses to run if any `SUPER_ADMIN` already exists.
- Creates the row with `role=SUPER_ADMIN`, `mustChangePassword=false`, `isActive=true`.
- Prints the created admin's email + id.

Run this once per environment after the first deploy. Ideally do it through an SSH'd bastion host or a one-shot CI job — you want to type the password, not bake it into CI config.

## Subsequent admins

A logged-in `SUPER_ADMIN` creates other admins via the API:

```bash
curl -X POST http://localhost:3000/api/v1/admin/admins \
  -H 'Authorization: Bearer <super-admin-access-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"content@example.com",
    "name":"Content Admin",
    "role":"CONTENT_ADMIN",
    "tempPassword":"Temp1234!"
  }'
```

- The temp password is communicated to the new admin out-of-band (Slack DM, password manager link, etc.).
- On first login, they're forced through `POST /api/v1/admin/auth/change-password` before any other endpoint will respond to their token.

## Deactivating an admin

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/admins/42 \
  -H 'Authorization: Bearer <super-admin-access-token>' \
  -H 'Content-Type: application/json' \
  -d '{"isActive":false}'
```

The `AdminJwtAuthGuard` checks `isActive` — a deactivated admin gets 401 on every request even if their access token hasn't expired. Their refresh tokens are left in place so they can be reactivated without re-seeding.

## Force password reset

```bash
curl -X POST http://localhost:3000/api/v1/admin/admins/42/reset-password \
  -H 'Authorization: Bearer <super-admin-access-token>'
```

Returns `{ tempPassword }`. Sets `mustChangePassword=true`. Revokes all existing refresh tokens.
