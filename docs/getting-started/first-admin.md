# Creating the first admin

Admin accounts live in a dedicated `admin_users` table — completely separate from end-user accounts. The very first super-admin is seeded via a CLI script.

## Seed the super-admin

```bash
yarn seed:super-admin --email you@example.com --password 'StrongPass1'
```

The script refuses to run if any `SUPER_ADMIN` already exists (safety — can't accidentally add another one from CLI).

## Log in

```bash
curl -X POST http://localhost:3000/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"StrongPass1"}'
```

You get back `{ admin, tokens }`. The admin `accessToken` is a JWT with a short TTL; treat it like the user-facing one.

## Create more admins

Any `SUPER_ADMIN` can create additional admins at any role:

```bash
curl -X POST http://localhost:3000/api/v1/admin/admins \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"content@example.com","name":"Content Admin","role":"CONTENT_ADMIN","tempPassword":"Temp1234!"}'
```

A freshly-created admin has `mustChangePassword=true` — every non-`/change-password` endpoint returns 403 until they call `POST /api/v1/admin/auth/change-password`.
