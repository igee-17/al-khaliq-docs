---
sidebar_position: 2
---

# Playlists CRUD

Create, read, update, delete user-owned playlists.

## POST /playlists

Create a new USER playlist. Visibility defaults to `PRIVATE`.

**Requires:** Bearer.

### Request

```json
{ "name": "Morning Energy" }
```

Only `name` is accepted. No visibility, cover image, or song list in the create call — add them via PATCH and the song endpoints afterwards.

**Rules:**
- `name` — 1–120 chars.

### Response — 201 Created

```json
{
  "id": 42,
  "name": "Morning Energy",
  "type": "USER",
  "visibility": "PRIVATE",
  "coverImageKey": null,
  "songCount": 0,
  "ownerUserId": 17,
  "createdAt": "2026-04-18T14:22:01.333Z",
  "updatedAt": "2026-04-18T14:22:01.333Z"
}
```

### curl

```bash
curl -X POST http://localhost:3000/api/v1/playlists \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Morning Energy"}'
```

---

## GET /playlists/:id

Playlist detail with full tracklist.

**Requires:** Bearer.

Visibility follows the [access matrix](./overview.md#access-matrix-quick-reference):
- Owner → always.
- `type: "ADMIN"` → any user.
- `type: "USER" AND visibility: "PUBLIC"` → any user.
- Otherwise → **404**.

### Response — 200 OK

```json
{
  "id": 42,
  "name": "Morning Energy",
  "type": "USER",
  "visibility": "PUBLIC",
  "coverImageKey": null,
  "songCount": 12,
  "ownerUserId": 17,
  "createdAt": "2026-04-18T14:22:01.333Z",
  "updatedAt": "2026-04-19T09:14:02.500Z",
  "songs": [
    {
      "song": PublicSongDto,
      "position": 1,
      "addedAt": "2026-04-19T09:14:02.500Z"
    },
    ...
  ]
}
```

- `songs` is ordered by `position`.
- **Only published + ready songs are returned.** If the playlist contains songs that have been unpublished, they're filtered out of the response (and `songCount` on the detail payload reflects the visible count). Admin endpoints under `/admin/playlists/:id` do see unpublished songs.

### Edge cases

| Case | Status |
|---|---|
| Not found / private + not owner | **404** |
| Non-integer `:id` | 400 |

---

## PATCH /playlists/:id

Rename and / or toggle visibility.

**Requires:** Bearer. **Owner only** — a non-owner hitting this endpoint gets `404` (not `403`).

### Request (partial — both fields optional)

```json
{
  "name": "New Name",
  "visibility": "PUBLIC"
}
```

### Behaviour

- Omitting a field leaves it unchanged.
- `visibility` toggles `PRIVATE` ↔ `PUBLIC`.
  - Flipping to `PUBLIC` makes the playlist shareable: anyone with the URL can view, play, and save it.
  - Flipping back to `PRIVATE` hides it from savers' libraries — but existing `SavedPlaylist` rows are retained server-side. If you flip back to `PUBLIC`, savers get the playlist back.

### Liked Songs restrictions

For the user's `LIKED_SONGS` playlist:
- `name` is frozen to `"Liked Songs"`.
- `visibility` is frozen to `PRIVATE`.
- Any PATCH that tries to change either returns **403**.

### Response — 200 OK

`PlaylistSummaryDto` for the updated playlist.

### Edge cases

| Case | Status |
|---|---|
| Unknown id | 404 |
| Non-owner | 404 |
| Trying to edit an admin playlist via this endpoint | 403 (admins must use `/admin/playlists/*`) |
| Trying to rename or un-privatise Liked Songs | 403 |
| Invalid visibility value | 400 |

---

## DELETE /playlists/:id

**Requires:** Bearer. **Owner only** — non-owner gets `404`.

Cascades: removes all `PlaylistSong` rows and all `SavedPlaylist` rows referencing this playlist.

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Unknown id | 404 |
| Non-owner | 404 |
| Deleting Liked Songs | **403** |
| Deleting an admin playlist via this endpoint | 403 |

### curl

```bash
curl -X DELETE http://localhost:3000/api/v1/playlists/42 \
  -H 'Authorization: Bearer <accessToken>'
```

## Sharing flow (pointer)

Want the playlist to be shareable? See [Sharing](./sharing.md). Short version: `PATCH { visibility: "PUBLIC" }` → the URL becomes the share link.
