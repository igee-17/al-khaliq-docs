---
sidebar_position: 6
---

# Playlist recommendations

Per-playlist "songs you might want to add" — powers the recommendations section on the playlist detail screen (with a "+" button per song and an "add all" button).

## GET /playlists/:id/recommendations

Up to 20 songs matched to the playlist's content.

**Requires:** Bearer. Same access rules as `GET /playlists/:id` — owner, or any user for PUBLIC / ADMIN playlists. Private + non-owner → 404.

### Response — 200 OK

```json
[ PublicSongDto, PublicSongDto, ... ]
```

Up to 20 songs. Never includes songs already in the playlist.

### Algorithm

1. Read all genres from songs currently in the playlist.
2. Pick the top 3 most-common genres.
3. Return songs in those genres ordered by `playCount DESC`, excluding songs already in the playlist.

**Empty playlist** (no songs to derive genres from): returns the globally popular songs of the last 7 days as a starter set. Same fallback as [home quick picks](../discovery/home.md#get-homequick-picks).

### Edge cases

| Case | Status |
|---|---|
| Unknown playlist id | 404 |
| Private + non-owner | 404 |
| `:id` not a positive integer | 400 |

### curl

```bash
curl http://localhost:3000/api/v1/playlists/42/recommendations \
  -H 'Authorization: Bearer <accessToken>'
```

## Add all

The "add all" button in the app spec is just:

```ts
const recs = await api.get(`/playlists/${playlistId}/recommendations`);
await api.post(`/playlists/${playlistId}/songs/bulk`, {
  songIds: recs.map(s => s.id),
});
```

See [Managing songs → bulk add](./songs-in-playlists.md#post-playlistsidsongsbulk). Duplicates get skipped automatically, but since recommendations already exclude playlist contents, there shouldn't be any.

## Scale notes

This is a simple SQL heuristic that performs well up to ~100K songs with the existing indexes. Personalised ranking (collaborative filtering, ML embeddings) is planned for a later phase — the response shape won't change.
