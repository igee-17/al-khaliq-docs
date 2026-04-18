---
sidebar_position: 5
---

# Admin playlists

Admin-curated playlists live under `/admin/playlists/*`. They appear in every user's library by default (`GET /me/library → adminPlaylists`), and users cannot save or remove them individually.

All endpoints require an admin Bearer (`SUPER_ADMIN` or `CONTENT_ADMIN`).

Admin playlists are always `visibility: "PUBLIC"` — there's no toggle.

## GET /admin/playlists

Paginated list of all admin playlists.

### Query

- `?page=` — default 1, min 1.
- `?limit=` — default 20, min 1, max 100.

### Response — 200 OK

```json
{
  "items": [
    {
      "id": 5,
      "name": "Top Hits 2026",
      "type": "ADMIN",
      "visibility": "PUBLIC",
      "coverImageKey": "images/playlists/top-hits-2026/cover.jpg",
      "songCount": 40,
      "ownerUserId": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 4,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

## GET /admin/playlists/:id

Detail view — **includes unpublished songs** so admins can curate pre-release.

### Response — 200 OK

`PlaylistDetailDto` (same shape as the public `/playlists/:id` but unfiltered).

---

## POST /admin/playlists

Create.

### Request

```json
{
  "name": "Top Hits 2026",
  "slug": "top-hits-2026",
  "coverImageKey": "images/playlists/top-hits-2026/cover.jpg"
}
```

- `name` — 1–120 chars, required.
- `slug` — optional. Lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Unique across admin playlists. Reserved for future public-URL sharing.
- `coverImageKey` — optional.

### Response — 201 Created

`PlaylistSummaryDto` with `type: "ADMIN"`, `visibility: "PUBLIC"`.

### Edge cases

| Case | Status |
|---|---|
| Duplicate slug | 409 |
| Invalid slug format | 400 |

---

## PATCH /admin/playlists/:id

Partial update: `name`, `slug`, `coverImageKey`.

`visibility` is **not editable** here — admin playlists are always PUBLIC.

Response: updated `PlaylistSummaryDto`.

---

## DELETE /admin/playlists/:id

Response: `204 No Content`. Cascades: all `PlaylistSong` rows removed.

---

## POST /admin/playlists/:id/songs

Append one song.

```json
{ "songId": 42 }
```

Response: `204`. Same 500-song cap + duplicate 409 rules as user playlists.

### Including unpublished songs

Admin playlists can include songs with any `status` — `PENDING_UPLOAD`, `PROCESSING`, `READY`, even `FAILED`. User-facing reads (`GET /playlists/:id`) filter out anything that isn't published + ready; admin reads (`GET /admin/playlists/:id`) don't.

This lets you stage a playlist before release — add songs now, publish them later, and they'll start showing up in the public view automatically.

---

## POST /admin/playlists/:id/songs/bulk

```json
{ "songIds": [42, 17, 8] }
```

Duplicates skipped; 500-song cap enforced on the final state. Response: `204`.

---

## DELETE /admin/playlists/:id/songs/:songId

Remove a song. Response: `204`. 404 if not in playlist.

---

## PUT /admin/playlists/:id/order

Reorder. Same full-array-replace semantics as user playlists — see [Managing songs → PUT /:id/order](../library/songs-in-playlists.md#put-playlistsidorder).

```json
{ "songIds": [8, 42, 17] }
```

Response: `204`.

---

## Building the admin panel UI

Recommended layout:

1. **List view** — `GET /admin/playlists` with pagination. Each row: name, song count, createdAt.
2. **Detail view** — `GET /admin/playlists/:id`:
   - Header: cover + name + slug + "Edit" / "Delete" buttons.
   - Tracklist — with drag-to-reorder → PUT `/order`.
   - "Add songs" — search via `GET /admin/songs` (see [Song upload](./song-upload.md) for the full admin song surface), then `POST /admin/playlists/:id/songs/bulk`.
3. **Create** — simple form (`name` required) then redirect to detail view for song management.
