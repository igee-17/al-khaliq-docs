---
sidebar_position: 3
---

# Search

One endpoint, three result sections. No cross-type ranking — each type is ranked independently.

## GET /search

**Requires:** Bearer.

### Query

- `?q=` — required. Minimum 2 characters, maximum 120.
- `?type=` — optional. One of `all` (default), `song`, `artist`, `album`.

### Response — 200 OK

```json
{
  "songs":   [ PublicSongDto,              ... ],
  "artists": [ PublicArtistSummaryDto,     ... ],
  "albums":  [ PublicAlbumSummaryDto,      ... ]
}
```

Each array is capped at 20.

- `songs` — `ILIKE '%q%'` on song title. Published + ready only. Ordered by `playCount DESC`.
- `artists` — `ILIKE '%q%'` on artist name. Ordered by name ASC.
- `albums` — `ILIKE '%q%'` on album title, only albums with ≥1 published song. Ordered by `releaseDate DESC`, then title.

### Filtering by type

If you pass `?type=song`, `artists` and `albums` return `[]`. Same for the others. Use this when the UI is on a type-specific tab (e.g. "Top" vs "Artists" vs "Albums").

### Edge cases

| Case | Status |
|---|---|
| `q` missing | `400 Bad Request` |
| `q` shorter than 2 chars | `400 Bad Request` |
| No matches | `200 OK` with all three arrays `[]` |
| `type` value not one of the four | `400 Bad Request` |

### curl

```bash
curl 'http://localhost:3000/api/v1/search?q=burna&type=all' \
  -H 'Authorization: Bearer <accessToken>'
```

## Recommended UI (matches the app spec)

The library "Add to a library" search screen per the spec: one text input. As the user types (debounce 300ms), hit `/search?q=…`. Render three sections. Filter chips ("Top" / "Rap" / "Pop" / "R&B") can narrow by `type` + re-ordering client-side, OR call `/explore/genres/:slug` if the filter is a genre.

## Scale notes

At current scale (< 100K songs) `ILIKE` is fine — it's an index scan with the indexes already in place. If latency climbs as the catalog grows, backend will swap to Postgres `tsvector` or Meilisearch without changing the response shape.
