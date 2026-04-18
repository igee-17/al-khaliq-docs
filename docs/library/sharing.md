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

`GET /me/library.savedPlaylists[i]` gives you the summary. Open the detail via `GET /playlists/:id` — same endpoint as your own playlists. Playback is identical: the mobile client builds a queue from `songs[].song` and calls `GET /songs/:id/stream` per track as playback starts.
