---
sidebar_position: 5
---

# Sharing playlists

User playlists are private by default. An owner can toggle visibility to `PUBLIC`, which makes the playlist's URL shareable. Recipients can view, play, and **save** the playlist to their own library.

Not collaborative — recipients can't edit shared playlists. That lands in a later phase.

## Making a playlist public

The owner flips visibility via [PATCH /playlists/:id](./playlists.md#patch-playlistsid):

```http
PATCH /api/v1/playlists/42
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "visibility": "PUBLIC" }
```

Response: updated `PlaylistSummaryDto` with `visibility: "PUBLIC"`.

The share link is just the app's deep-link / web URL that points at `/playlists/42` — no separate token is needed. (Unguessable share tokens are on the roadmap if you need stricter privacy.)

## Access matrix

Who can `GET /playlists/:id`:

| `type` | `visibility` | Allowed readers |
|---|---|---|
| `LIKED_SONGS` | `PRIVATE` | owner only — all others get **404** |
| `USER` | `PRIVATE` | owner only — all others get **404** |
| `USER` | `PUBLIC` | any authenticated user |
| `ADMIN` | `PUBLIC` | any authenticated user |

**Private + non-owner = 404, not 403.** The API never confirms that a private playlist exists.

## POST /playlists/:id/save

Save a public USER playlist to your library. It'll appear in `GET /me/library → savedPlaylists`.

**Requires:** Bearer.

### Request

No body.

### Response — 201 Created

```json
{
  "id": 42,
  "name": "Morning Energy",
  "type": "USER",
  "visibility": "PUBLIC",
  …
}
```

The `PlaylistSummaryDto` of the saved playlist.

### Edge cases

| Case | Status | Reason |
|---|---|---|
| The playlist is **yours** | **409** | `"You own this playlist"`. It's already in your `userPlaylists`. |
| The playlist is **admin-curated** (`type: "ADMIN"`) | **409** | `"Admin playlists are already in your library"`. Admin playlists surface for everyone automatically — saving them would be a no-op duplication. |
| The playlist is **private** and you don't own it | **404** | Same as GET — don't confirm existence. |
| Already saved | **409** | One save per user per playlist (enforced by a unique constraint). |
| Unknown id | 404 | |

---

## DELETE /playlists/:id/save

Unsave a playlist.

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Not currently saved by this user | 404 |

---

## What happens when the owner unshares?

If the owner flips a public playlist back to `PRIVATE` (via `PATCH`), existing `SavedPlaylist` rows **are not deleted**. Instead:

- On every saver's next `GET /me/library`, the playlist is **silently dropped** from `savedPlaylists`. They can no longer open it (GET returns 404).
- If the owner flips it back to `PUBLIC`, the playlist **reappears** in every saver's library automatically — their saved state was preserved.
- A saver can still **unsave** a now-private playlist explicitly via `DELETE /playlists/:id/save`. This 204s regardless of the current visibility.

This mirrors the expected UX: the owner's visibility change shouldn't silently delete other users' library rows.

## Recommended UX

### For the owner

- On the playlist detail screen, expose a "Share" button. When tapped:
  - If `visibility === "PRIVATE"`: PATCH to `PUBLIC`, then generate the share sheet with the URL.
  - If already `PUBLIC`: show "Copy link" + "Make private" options.

### For the recipient

- Share links open the app on `/playlists/:id`. Fetch the playlist.
- If the playlist is public: show a "Save to library" button.
  - Already saved: show "Saved" with an "Unsave" affordance.
  - Not saved: tap → `POST /playlists/:id/save` → 201 → show "Saved".

## Playing a saved playlist

`GET /me/library.savedPlaylists[i]` gives you the summary. Open the detail via `GET /playlists/:id` — same endpoint as your own playlists. Playback is identical: the mobile client builds a queue from `songs[].song` and calls `GET /songs/:id/stream` per track as playback starts. For one-tap "Play all", use [`POST /playlists/:id/play`](../playback/now-playing-sync.md#post-playlistsidplay-and-post-albumsidplay).

---

## Share-sheet metadata — `/share/*`

When the user taps "Share" on any shareable resource (song, album, artist, playlist), the mobile app needs the title, description, and image to build the native iOS / Android share sheet. That's what this API returns.

**These endpoints return only JSON — the HTML unfurl pages (for iMessage / WhatsApp / Twitter previews) are a separate web surface, not part of this API.**

### GET /share/songs/:id

**Requires:** Bearer.

Returns share metadata for a published + ready song.

```json
{
  "resourceType": "song",
  "id": 42,
  "title": "Last Last",
  "description": "Song by Burna Boy",
  "imageKey": "images/albums/7/cover.jpg",
  "canonicalUrl": "https://al-khaliq.app/songs/42",
  "appDeepLink": "alkhaliq://songs/42"
}
```

| Field | Notes |
|---|---|
| `description` | `"Song by {primaryArtist.name}"` |
| `imageKey` | `album.coverImageKey` if the song is on an album; `null` otherwise. Use the artist's image as a fallback on the client if needed. |
| `canonicalUrl` | Built from the `PUBLIC_WEB_URL` env var + the resource path. |
| `appDeepLink` | Built from the `APP_DEEP_LINK_SCHEME` env var (default `alkhaliq`). |

Unpublished / deleted song → **404**.

### GET /share/albums/:id

Description: `"Album · {year} · {primaryArtist.name}"` when `releaseDate` is set; `"Album · {primaryArtist.name}"` otherwise.

### GET /share/artists/:id

Description: `"Artist"`. `imageKey: artist.imageKey`.

### GET /share/playlists/:id

Description: `"Playlist · {songCount} song"` / `"Playlist · {songCount} songs"` (correctly singularised).

Visibility rules (same as `GET /playlists/:id`):

| `type` | `visibility` | Allowed callers |
|---|---|---|
| `LIKED_SONGS` | `PRIVATE` | owner only → 404 for everyone else |
| `USER` | `PRIVATE` | owner only → 404 |
| `USER` | `PUBLIC` | any authenticated user |
| `ADMIN` | any | any authenticated user (admin playlists are always shareable) |

### Not in scope

- **HTML unfurl pages.** Building an OG-meta web page at `/songs/42` so iMessage shows a preview card is a separate surface (backend doesn't render HTML). If/when that lands, these JSON endpoints will still be the source of truth.
- **Short-link service.** `al-khaliq.app/s/abc12` → redirect is a future enhancement.

### curl

```bash
curl http://localhost:3000/api/v1/share/songs/42 \
  -H 'Authorization: Bearer <accessToken>'
```
