---
sidebar_position: 8
---

# Not interested

Mark songs the user doesn't want to see in **recommendations**. Powers the "Not interested" action in the 3-dot song menu.

## Scope

Marking a song as not-interested filters it out of **recommendation surfaces only**:

- `GET /home/quick-picks`
- `GET /explore/recommendations`
- `GET /songs/:id/related`
- `GET /playlists/:id/recommendations`

It does **not** hide the song from:

- `GET /search`
- `GET /explore/genres/:slug`
- `GET /songs/:id` (direct fetch)
- `GET /artists/:id` (topSongs)
- `GET /albums/:id` (tracklist)
- `GET /me/library` or any playlist

Users can still find and play the song deliberately — they just won't be recommended it again.

## POST /me/not-interested

**Requires:** Bearer.

### Request

```json
{ "songId": 42 }
```

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song already marked | **409** |
| Unknown song id | **400** |

---

## DELETE /me/not-interested/:songId

Unmark.

### Response — 204 No Content

| Case | Status |
|---|---|
| Song not marked | 404 |

---

## GET /me/not-interested

List songs the user has marked, most-recently-marked first. Useful for a "Manage preferences" screen.

### Query

- `?limit=` — default 50, max 200.

### Response — 200 OK

```json
[ PublicSongDto, PublicSongDto, ... ]
```

Songs that have since been unpublished are filtered out of this list (the row is retained so unpublish → republish preserves the mark).

---

## GET /me/not-interested/status?songIds=1,2,3

Batch check. Same 1–100 rule as the other status endpoints.

### Response — 200 OK

```json
{ "notInterested": [1, 3] }
```

## How the exclusion works

The backend tracks a single per-user set. On every call to a recommendation endpoint it:

1. Loads `{userId} → Set<songId>` of not-interested ids.
2. Adds those ids to the endpoint's excluded-id list, alongside "already played" / "already in playlist" / etc.

**Consequence:** the rail may legitimately return fewer than the usual 20 if the user has marked a lot of matches. The backend doesn't try to backfill — if nothing matches the user's taste today, the rail is sparse. That's better UX than forcing songs the user already said they don't like.

## Recommended UX

- 3-dot menu → "Not interested" → `POST /me/not-interested` → show a brief toast `"We won't recommend this again"` → navigate past the song.
- Settings / Preferences screen: `GET /me/not-interested` with a per-row "Show me this again" action → `DELETE /me/not-interested/:songId`.
