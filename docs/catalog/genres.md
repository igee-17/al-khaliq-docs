---
sidebar_position: 4
---

# Genres

## GET /genres

Full list of genres.

**Requires:** Bearer.

### Response — 200 OK

```json
[
  { "id": 1, "name": "Afrobeats", "slug": "afrobeats" },
  { "id": 2, "name": "Pop",       "slug": "pop" },
  { "id": 3, "name": "Rap",       "slug": "rap" },
  { "id": 4, "name": "R&B",       "slug": "r-b" }
]
```

Genres are small (~10–30 rows). No pagination.

## Using the slug

Use the `slug` (not the `id`) for URLs + the genre-browse endpoint:

```
GET /explore/genres/:slug
```

See [Discovery → Explore](../discovery/explore.md).

### curl

```bash
curl http://localhost:3000/api/v1/genres \
  -H 'Authorization: Bearer <accessToken>'
```
