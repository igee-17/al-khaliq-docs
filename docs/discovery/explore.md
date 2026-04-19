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

1. Compute the user's top 3 genres from non-SKIPPED plays in the last 30 days.
2. **Discovery tier:** return songs whose genres don't overlap with those 3, ordered by `playCount DESC`, excluding anything in the user's exclusion set.
3. **Editorial tier:** if fewer than 20 results, top up with `isEditorial` songs.
4. **Popular tier:** if still fewer than 20, top up with most-played-last-7-days.

The exclusion set is the same as [quick-picks](./home.md#exclusion-set):

- Songs played (any `THRESHOLD` or `COMPLETED` event).
- Songs marked **[not interested](../library/not-interested.md)**.
- Songs hit by the [over-skipped heuristic](./home.md#over-skipped-heuristic) (3 `SKIPPED` in 30 days).

### Known nuance — fallback tiers don't re-apply genre filter

The discovery tier excludes the user's top-3 genres, but the editorial and popular fallbacks don't re-check genre. So a user who has only ever played pop may still see the occasional pop song if discovery doesn't produce 20 results and a pop song is editorial-flagged or popular-last-7d. The discovery tier always runs first, so genre-matched results outrank fallbacks in the response order.

If you want a stricter "never show me my top genres again" guarantee, filter client-side on top of this response.

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
