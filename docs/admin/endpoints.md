# Admin endpoints

All under `/api/v1/admin`. All behind the admin JWT guard. Role constraints per endpoint are listed in the table.

Live OpenAPI schema: `http://localhost:3000/docs` in dev.

## Admin users management

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/admins` | SUPER_ADMIN | list admins |
| POST | `/admins` | SUPER_ADMIN | create admin `{ email, name, role, tempPassword }` |
| PATCH | `/admins/:id` | SUPER_ADMIN | update role / isActive |
| POST | `/admins/:id/reset-password` | SUPER_ADMIN | force reset, returns new temp password |

## Catalog — Artists

| Method | Path | Role | |
|---|---|---|---|
| GET | `/artists` | ADMIN | paginated list |
| GET | `/artists/:id` | ADMIN | detail |
| POST | `/artists` | ADMIN | create |
| PATCH | `/artists/:id` | ADMIN | update |
| DELETE | `/artists/:id` | ADMIN | 204. Refuses if any song references it. |

## Catalog — Albums

| Method | Path | Role | |
|---|---|---|---|
| GET | `/albums` | ADMIN | paginated list |
| GET | `/albums/:id` | ADMIN | detail |
| POST | `/albums` | ADMIN | create |
| PATCH | `/albums/:id` | ADMIN | update |
| DELETE | `/albums/:id` | ADMIN | 204. Refuses if songs reference it. |

## Catalog — Genres

| Method | Path | Role | |
|---|---|---|---|
| GET | `/genres` | ADMIN | list |
| POST | `/genres` | ADMIN | create |
| PATCH | `/genres/:id` | ADMIN | update |
| DELETE | `/genres/:id` | ADMIN | 204 |

## Catalog — Songs

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/songs` | ADMIN | paginated, filters: status, publishedOnly, artistId, genreId, albumId, search |
| GET | `/songs/:id` | ADMIN | detail |
| POST | `/songs` | ADMIN | create metadata row → `status=PENDING_UPLOAD` |
| PATCH | `/songs/:id` | ADMIN | update metadata |
| DELETE | `/songs/:id` | ADMIN | 204. Cleans up S3 assets. |
| POST | `/songs/:id/upload-url` | ADMIN | returns presigned PUT URL for the raw file |
| POST | `/songs/:id/complete-upload` | ADMIN | submits MediaConvert job → `status=PROCESSING` |
| POST | `/songs/:id/retry` | ADMIN | re-submit if `FAILED` |
| POST | `/songs/:id/publish` | ADMIN | only when `READY` → sets `publishedAt=now()` |
| POST | `/songs/:id/unpublish` | ADMIN | clears `publishedAt` |

## Uploads (images)

| Method | Path | Role | |
|---|---|---|---|
| POST | `/uploads/image-url` | ADMIN | presigned PUT for artist image / album cover |

"ADMIN" = either `SUPER_ADMIN` or `CONTENT_ADMIN`.
