---
sidebar_position: 3
---

# Search

One endpoint, three result sections. No cross-type ranking — each type is ranked independently. Supports an optional genre filter for the "Top / Rap / Pop / R&B" tabs in the mobile app's add-to-playlist flow.

## GET /search

**Requires:** Bearer.

### Query

| Name | Required? | Notes |
|---|---|---|
| `q` | required **unless** `genre` is set | 2–120 chars. When `genre` is set, `q` is optional (browse-by-genre mode). |
| `type` | optional | One of `all` (default), `song`, `artist`, `album`. |
| `genre` | optional | Genre slug (lowercase, dashes). When set, narrows songs to that genre; artists + albums sections become `[]`. |

### Response — 200 OK

```json
{
  "songs":   [ PublicSongDto,              ... ],
  "artists": [ PublicArtistSummaryDto,     ... ],
  "albums":  [ PublicAlbumSummaryDto,      ... ]
}
```

Each array is capped at 20.

- `songs` — `ILIKE '%q%'` on song title (if `q` set) AND `genres: [{ slug = genre }]` (if `genre` set). Published + ready only. Ordered by `playCount DESC`.
- `artists` — `ILIKE '%q%'` on artist name. Ordered by name ASC. **Empty when `genre` is set.**
- `albums` — `ILIKE '%q%'` on album title, only albums with ≥1 published song. Ordered by `releaseDate DESC`, then title. **Empty when `genre` is set.**

### Mode matrix

| `q` | `genre` | Behaviour |
|---|---|---|
| set | unset | Full three-section search (legacy). |
| set | set | Songs filtered to title match + genre. Artists/albums empty. |
| unset | set | Browse genre's popular songs (no text filter). Artists/albums empty. |
| unset | unset | `400` — nothing to search on. |

### Edge cases

| Case | Status |
|---|---|
| `q` missing AND `genre` unset | `400` |
| `q` shorter than 2 chars | `400` |
| `genre` slug unknown | `404` |
| `genre` slug not lowercase / contains invalid chars | `400` |
| `type` value not one of the four | `400` |
| No matches | `200` with all three arrays `[]` |

### curl

```bash
# Search all + "burna" across the catalog
curl 'http://localhost:3000/api/v1/search?q=burna' \
  -H 'Authorization: Bearer <accessToken>'

# Search "burna" within afrobeats only
curl 'http://localhost:3000/api/v1/search?q=burna&genre=afrobeats' \
  -H 'Authorization: Bearer <accessToken>'

# Browse popular afrobeats (no query)
curl 'http://localhost:3000/api/v1/search?genre=afrobeats' \
  -H 'Authorization: Bearer <accessToken>'
```

## Recommended UI (matches the app spec)

The library "Add to a library" search screen:

- **One text input.** As the user types (debounce 300ms), hit `/search?q=…&genre=…`.
- **Genre tabs** along the top: "Top / Rap / Pop / R&B / …". "Top" = no `genre` param. Tapping a genre tab sets `?genre=<slug>`.
- **In genre mode**, hide the artists + albums sections (they come back empty anyway).

```
┌────────────── Search ───────────────┐
│ [    burna                        ] │
│ [ Top ] [ Rap ] (Pop) [ R&B ] …     │
│                                     │
│ Songs                               │
│  ♫ Burna Pop Hit   (Burna Boy)    +│
│  ♫ Another Pop     (Wizkid)       +│
│  ...                                │
└─────────────────────────────────────┘
```

Tap `+` to append to the currently-edited playlist (uses `POST /playlists/:id/songs`).

## Scale notes

At current scale (< 100K songs) `ILIKE` is fine — it's an index scan with the indexes already in place. If latency climbs as the catalog grows, backend will swap to Postgres `tsvector` or Meilisearch without changing the response shape.
