---
sidebar_position: 2
---

# Explore

Two endpoints for the Explore tab: genre browsing + personalised recommendations.

## GET /explore/genres/:slug

Paginated list of songs in a genre, ordered by `playCount DESC`.

**Requires:** Bearer.

### Path / query

- `:slug` — the genre's `slug` field (from `GET /genres`). Examples: `pop`, `r-b`, `afrobeats`.
- `?page=` — default 1, min 1.
- `?limit=` — default 20, min 1, max 100.

### Response — 200 OK

```json
{
  "items": [ PublicSongDto, ... ],
  "total": 140,
  "page": 1,
  "limit": 20,
  "totalPages": 7
}
```

### Edge cases

| Case | Status |
|---|---|
| Unknown slug | `404 Not Found` |
| `?page=abc` or non-integer | `400 Bad Request` |
| `?limit=200` (above max) | `400 Bad Request` |

### curl

```bash
curl 'http://localhost:3000/api/v1/explore/genres/afrobeats?page=1&limit=20' \
  -H 'Authorization: Bearer <accessToken>'
```

---

## GET /explore/recommendations

Up to 20 songs biased toward **genres outside** the user's top 3 recent genres — i.e. "discover something new". Falls back to editorial → popular for new users.

**Requires:** Bearer.

### Response — 200 OK

```json
[ PublicSongDto, ... ]
```

Up to 20 songs.

### How it's picked

1. Compute the user's top 3 genres from plays last 30 days.
2. Return songs whose genres don't overlap with those 3, ordered by `playCount DESC`, excluding anything already played.
3. If fewer than 20 results: top up with `isEditorial` songs, then popular-last-7-days.

### curl

```bash
curl http://localhost:3000/api/v1/explore/recommendations \
  -H 'Authorization: Bearer <accessToken>'
```

## Recommended UI

The app spec's Explore page has:

- **Search input** — wire to [Search](./search.md).
- **"Discover something new"** — render `GET /genres` as a grid of genre cards. Tap → `/explore/genres/:slug`.
- **"Recommendations"** — render this endpoint with a "Play all" button that shuffles + starts playback.
