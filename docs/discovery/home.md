---
sidebar_position: 1
---

# Home feed

Two separate endpoints, both return fixed-size flat arrays (no pagination).

## GET /home/new-releases

20 most-recently-released albums, only albums with at least one published + ready song.

**Requires:** Bearer.

### Response — 200 OK

```json
[
  {
    "id": 2,
    "title": "African Giant",
    "slug": "african-giant",
    "coverImageKey": "images/albums/2/cover.jpg",
    "releaseDate": "2019-07-26T00:00:00.000Z",
    "primaryArtist": { "id": 7, "name": "Burna Boy", "slug": "burna-boy", "imageKey": "images/artists/7/cover.jpg" }
  },
  ...
]
```

Up to 20 items. Ordered by `releaseDate DESC`, tie-break `title ASC`.

Tap an album → `/albums/:id` detail.

---

## GET /home/quick-picks

Up to 20 songs personalised for this user. The algorithm:

1. **Personalised** — take songs by the user's top 10 primary artists (by plays last 30 days), excluding songs already played, ordered by `playCount DESC`.
2. **Editorial** — if fewer than 20 results, top up with admin-flagged `isEditorial` songs (ordered by `playCount DESC`).
3. **Popular** — if still fewer than 20, top up with songs with the most plays in the last 7 days.

New users (no plays yet) go straight to editorial → popular. Returning users never see songs they've already played.

Songs the user has marked **[not interested](../library/not-interested.md)** are filtered out of every tier.

**Requires:** Bearer.

### Response — 200 OK

```json
[
  PublicSongDto,
  PublicSongDto,
  ...
]
```

Up to 20 songs (can be fewer if the catalog is small).

### Edge cases

| Case | Behaviour |
|---|---|
| Brand new catalog (< 20 total songs) | Returns fewer than 20, possibly empty. |
| User has played every song | Falls back to editorial/popular which may include some already-played songs once the exclusion exhausts non-played songs. |

### curl

```bash
curl http://localhost:3000/api/v1/home/quick-picks \
  -H 'Authorization: Bearer <accessToken>'
```

## Recommended UI

Render these as two horizontal-scroll rails at the top of the home screen:

- Rail 1: "New releases" — albums (tap → album detail).
- Rail 2: "Quick picks" — songs (tap → start playback).

Each item should have a 3-dot menu matching the app spec (play next, save to playlist, share, add to queue, download, pin to home, not interested, favorite). Those per-song actions will be exposed in Phase 3/4 endpoints.
