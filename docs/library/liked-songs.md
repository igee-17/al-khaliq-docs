---
sidebar_position: 4
---

# Liked Songs

Shortcut endpoints to like / unlike a song without needing to know the user's Liked Songs playlist id. The system playlist is **lazy-created** on first use.

## POST /me/liked-songs

Like a song (add to Liked Songs).

**Requires:** Bearer.

### Request

```json
{ "songId": 42 }
```

### Response — 204 No Content

### Behaviour

- First call: creates the user's `LIKED_SONGS` playlist if it didn't exist yet, then appends the song.
- Subsequent calls: just append.
- Songs are appended to the **end** (most-recently-liked at the bottom of the position order — this matches what `GET /playlists/:id` returns for Liked Songs).

### Edge cases

| Case | Status |
|---|---|
| Song already liked | **409** |
| Unknown / unpublished / not-ready song | **400** (`"Song is not available"`) |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/liked-songs \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"songId":42}'
```

---

## DELETE /me/liked-songs/:songId

Unlike a song.

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song isn't in Liked Songs | 404 |

---

## GET /me/liked-songs/status?songIds=1,2,3

Batch-check which of the given ids the user has liked. Use this to light up heart icons on song listings without calling the API per-song.

### Query

- `?songIds=` — comma-separated positive integers. **1–100 ids max** per call.

### Response — 200 OK

```json
{ "liked": [1, 3] }
```

The subset of the requested ids that the user has liked. Unknown ids are simply omitted.

### Edge cases

| Case | Status |
|---|---|
| `songIds` missing / empty | 400 |
| More than 100 ids | 400 |
| Duplicate ids in the query | 400 |
| Non-integer ids (e.g. `songIds=abc,1`) | 400 |

### Typical use

On a song-list screen (home, search, album detail), extract the unique song ids visible in the viewport, call this endpoint once, then render the heart icon state per song:

```ts
const visibleIds = songs.map(s => s.id);
const { liked } = await api.get(`/me/liked-songs/status?songIds=${visibleIds.join(',')}`);
const likedSet = new Set(liked);
// …render each song with isLiked = likedSet.has(song.id)
```

## Fetching Liked Songs as a playlist

To render the actual list of liked songs (for the "Liked Songs" screen tap-in), call:

```http
GET /me/library
```

→ use `likedSongs.id` from the response, then

```http
GET /playlists/:id
```

This returns the standard `PlaylistDetailDto` with `type: "LIKED_SONGS"` and all the liked songs as a tracklist. See [Playlists CRUD → GET](./playlists.md#get-playlistsid).
