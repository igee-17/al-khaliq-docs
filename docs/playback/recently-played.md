---
sidebar_position: 3
---

# Recently played

## GET /me/recently-played

The user's recently-played songs, deduped by song, most-recent-first.

**Requires:** Bearer.

### Query

- `?limit=` — optional. Default 20, min 1, max 50.

### Response — 200 OK

```json
[
  {
    "song": PublicSongDto,
    "lastPlayedAt": "2026-04-18T14:22:01.333Z"
  },
  ...
]
```

- One entry per distinct song — replaying the same song updates its `lastPlayedAt` instead of creating a new row.
- Excludes songs that have since been unpublished (they just drop off the list).

### Edge cases

| Case | Status |
|---|---|
| `?limit=100` (above max) | `400 Bad Request` |
| No plays yet | `200 OK` with `[]` |

### curl

```bash
curl 'http://localhost:3000/api/v1/me/recently-played?limit=20' \
  -H 'Authorization: Bearer <accessToken>'
```

## When is it updated?

Every successful `POST /playback/events` upserts the row. The backend handles that automatically — the client just fires play events and reads this endpoint.

## Recommended UI

- Home screen rail labelled "Recently played" — render this endpoint as a horizontal-scroll list, limit 20.
- Tap → open the song / start playback.

The dedupe + bump behaviour gives the intuitive UX where the song you just listened to moves to the front of the list.
