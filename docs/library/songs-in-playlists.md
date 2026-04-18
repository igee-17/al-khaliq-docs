---
sidebar_position: 3
---

# Managing songs in a playlist

Add, remove, and reorder. All endpoints are **owner-only** on USER playlists (Liked Songs is considered the user's and accepts these directly).

## POST /playlists/:id/songs

Append one song to the end of the playlist.

### Request

```json
{ "songId": 42 }
```

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song is already in this playlist | **409** |
| Playlist already has 500 songs | **409** |
| Unknown songId | 400 |
| Non-owner | 404 (never confirms playlist existence) |
| Trying to add to an admin playlist via this endpoint | 403 |

---

## POST /playlists/:id/songs/bulk

Append many songs at once. Duplicates already in the playlist are **silently skipped**, but the size cap still applies to the final state.

### Request

```json
{ "songIds": [42, 17, 8] }
```

**Rules:**
- `songIds` — 1 to 500 entries, all positive integers, no duplicates within the array.

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Any songId doesn't exist | 400 (all-or-nothing — nothing is added if any id is invalid) |
| Array has duplicates within itself | 400 |
| Array longer than 500 | 400 |
| Adding would exceed 500 in the playlist after dedupe | **409** |

**To populate a playlist of >500 ids:** split into chunks ≤500 and send multiple bulk requests. Each call is idempotent.

---

## DELETE /playlists/:id/songs/:songId

Remove a song from the playlist. Positions of remaining songs are **not** renumbered — gaps are fine and invisible via the `ORDER BY position` response.

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song not in the playlist | 404 |
| Non-owner | 404 |

---

## PUT /playlists/:id/order

Reorder the full tracklist. Send the complete list of song ids in the new order.

### Request

```json
{ "songIds": [8, 42, 17] }
```

**Rules:**
- Array must contain **exactly** the current set of song ids in the playlist — no missing, no extras, no duplicates. If the set doesn't match → **400**.

### Response — 204 No Content

### Why send the full order?

Simple + correct. The client holds the current order in memory (from the last `GET /playlists/:id`), lets the user drag-reorder, and PUTs the new array. The server renumbers all positions in one transaction. No partial-state semantics to reason about.

### Client-side example

```ts
// user drags: swap indices 0 and 2
const newOrder = [...currentTracklist];
[newOrder[0], newOrder[2]] = [newOrder[2], newOrder[0]];

await api.put(`/playlists/${id}/order`, {
  songIds: newOrder.map(t => t.song.id),
});
```

### Edge cases

| Case | Status |
|---|---|
| Sent set doesn't match current set | **400** |
| Non-owner | 404 |
| Empty array on an empty playlist | 204 (no-op) |

## Adding from recommendations / search

Two common UX patterns backed by the same endpoints:

1. **"Add all" from [playlist recommendations](./recommendations.md)** — POST `/songs/bulk` with the rec list; duplicates get skipped.
2. **"Add to library" search flow** (from the app spec) — the user searches via [GET /search](../discovery/search.md) and taps a "+" on each result. That "+" calls `POST /me/liked-songs` (adds to Liked Songs). To add to a specific playlist, call `POST /playlists/:id/songs` instead.
