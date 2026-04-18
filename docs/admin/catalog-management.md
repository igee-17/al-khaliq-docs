---
sidebar_position: 3
---

# Catalog management

CRUD for Artists, Albums, Genres. Both `SUPER_ADMIN` and `CONTENT_ADMIN` can call all of these.

All endpoints require an **admin Bearer**. All listing endpoints are paginated (`?page=`, `?limit=`, max 100).

## Artists

### GET /admin/artists

Paginated list.

Query: `?page=&limit=&search=` (search matches `name` case-insensitive).

```json
{
  "items": [
    { "id": 7, "name": "Burna Boy", "slug": "burna-boy", "imageKey": null, "bio": null, "createdAt": "…", "updatedAt": "…" }
  ],
  "total": 1, "page": 1, "limit": 20, "totalPages": 1
}
```

### GET /admin/artists/:id

```json
{ "id": 7, "name": "Burna Boy", "slug": "burna-boy", "imageKey": null, "bio": null, "createdAt": "…", "updatedAt": "…" }
```

### POST /admin/artists

```json
{
  "name": "Burna Boy",
  "slug": "burna-boy",
  "bio": "Nigerian afrobeats star",
  "imageKey": "images/artists/tmp/cover.jpg"
}
```

- `slug` optional — auto-generated from `name` if omitted, with `-2`, `-3` suffix on collision.
- `slug` must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase kebab-case).

Response: 201 with the full artist.

### PATCH /admin/artists/:id

Partial update. Same fields as create, all optional.

### DELETE /admin/artists/:id

204 on success.

Refuses with **400 Bad Request** (`"A referenced record does not exist"`) if any song or album references this artist. Delete those first, or reassign.

## Albums

Same shape as artists. Additional field:

- `primaryArtistId` — required on create, FK to Artist.
- `coverImageKey` — optional.
- `releaseDate` — optional ISO date string.

```http
POST /admin/albums
{
  "title": "African Giant",
  "primaryArtistId": 7,
  "releaseDate": "2019-07-26",
  "coverImageKey": "images/albums/tmp/cover.jpg"
}
```

Query on list: `?page=&limit=&artistId=&search=`.

Delete: songs that reference the album have their `albumId` set to null (ON DELETE SET NULL) — they aren't deleted.

## Genres

```http
POST /admin/genres
{ "name": "Afrobeats", "slug": "afrobeats" }
```

- Unique by `name` and by `slug`.
- `slug` auto-generated if omitted.

List is not paginated — genres are a small set.

Delete refuses with 400 if songs reference it.

## Image uploads

For artist/album images, ask for a presigned PUT URL, then upload to S3 directly — identical pattern to song uploads but smaller and simpler. Endpoint (not built yet at time of writing):

```
POST /admin/uploads/image-url
{ "contentType": "image/jpeg" }
```

Response (planned):

```json
{ "uploadUrl": "...", "key": "images/tmp/<uuid>.jpg", "expiresAt": "..." }
```

Then set that `key` as `imageKey` / `coverImageKey` on the artist / album via PATCH.

## Slug rules

- Lowercase kebab-case only: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Auto-generated from `name` / `title` with `slugify` and `-2`, `-3` suffix on collision.
- Can be explicitly overridden by admin. Validation: 409 on conflict.
