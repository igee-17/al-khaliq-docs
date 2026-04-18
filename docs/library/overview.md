---
sidebar_position: 1
---

# Library overview

The library screen is one endpoint that returns four sections, plus a consistent `PlaylistSummaryDto` shape reused across everything in this section.

## GET /me/library

Every piece of data the library screen needs in one response.

**Requires:** Bearer.

### Response — 200 OK

```json
{
  "likedSongs": PlaylistSummaryDto,
  "userPlaylists": PlaylistSummaryDto[],
  "savedPlaylists": PlaylistSummaryDto[],
  "adminPlaylists": PlaylistSummaryDto[]
}
```

| Field | Contents |
|---|---|
| `likedSongs` | The user's system Liked Songs playlist. **Always present** — lazy-created if it didn't exist. `type: "LIKED_SONGS"`, `visibility: "PRIVATE"`. |
| `userPlaylists` | Playlists the user created (`type: "USER"`). Ordered by `createdAt DESC`. |
| `savedPlaylists` | Public USER playlists the user has saved (via `POST /playlists/:id/save`). Only includes ones that are **still PUBLIC** — if the owner flipped a saved playlist back to PRIVATE, it drops off this list silently (the save row is retained in case the owner re-publishes). Ordered by `createdAt DESC`. |
| `adminPlaylists` | All `type: "ADMIN"` playlists. These are visible to every user by default — no save mechanic. Ordered by `createdAt DESC`. |

### curl

```bash
curl http://localhost:3000/api/v1/me/library \
  -H 'Authorization: Bearer <accessToken>'
```

## PlaylistSummaryDto

Every place that lists playlists returns this shape:

```json
{
  "id": 42,
  "name": "Morning Energy",
  "type": "USER",
  "visibility": "PRIVATE",
  "coverImageKey": null,
  "songCount": 23,
  "ownerUserId": 17,
  "createdAt": "2026-04-18T14:22:01.333Z",
  "updatedAt": "2026-04-18T14:22:01.333Z"
}
```

- `type` — `"USER"` / `"ADMIN"` / `"LIKED_SONGS"`.
- `visibility` — `"PRIVATE"` / `"PUBLIC"`. Admin playlists are always `PUBLIC`; Liked Songs is always `PRIVATE`.
- `coverImageKey` — S3 key. Null for user playlists (client renders a default tile). Can be set for admin playlists.
- `songCount` — current number of songs in the playlist.
- `ownerUserId` — null for admin playlists; otherwise the owner's user id.

Fetch the full tracklist with [GET /playlists/:id](./playlists.md#get-playlistsid).

## Access matrix quick reference

Who can GET a playlist:

| `type` | `visibility` | Allowed readers |
|---|---|---|
| `LIKED_SONGS` | `PRIVATE` | owner only — all others get **404** |
| `USER` | `PRIVATE` | owner only — all others get **404** |
| `USER` | `PUBLIC` | any authenticated user |
| `ADMIN` | `PUBLIC` | any authenticated user |

Non-owner reading a private playlist returns **404, not 403** — don't confirm existence.

Writes (PATCH/DELETE/song add/remove/reorder) are always **owner-only** on USER and LIKED_SONGS playlists. Admin playlists reject writes on the user-facing routes (must use `/admin/playlists/*`).

## Recommended UI

The library screen renders sections in this order (matches the app spec's "banners showing 'liked songs', and any other playlist the user created, or admin created"):

1. **Liked Songs** card (always first)
2. **Your playlists** rail — `userPlaylists`
3. **Saved** rail — `savedPlaylists`
4. **Made for you** / admin curation rail — `adminPlaylists`

Each rail is a horizontal-scroll of cards. Card shows cover + name + songCount. Tap → [GET /playlists/:id](./playlists.md#get-playlistsid).
