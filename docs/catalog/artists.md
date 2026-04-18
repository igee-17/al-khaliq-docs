---
sidebar_position: 2
---

# Artists

## GET /artists/:id

Artist detail page: bio, top songs, album summary list.

**Requires:** Bearer.

### Response — 200 OK

```json
{
  "id": 7,
  "name": "Burna Boy",
  "slug": "burna-boy",
  "imageKey": "images/artists/7/cover.jpg",
  "bio": "Nigerian afrobeats star…",
  "topSongs": [
    PublicSongDto,
    ...
  ],
  "albums": [
    {
      "id": 2,
      "title": "African Giant",
      "slug": "african-giant",
      "coverImageKey": "images/albums/2/cover.jpg",
      "releaseDate": "2019-07-26T00:00:00.000Z",
      "primaryArtist": {
        "id": 7,
        "name": "Burna Boy",
        "slug": "burna-boy",
        "imageKey": "images/artists/7/cover.jpg"
      }
    }
  ]
}
```

- `topSongs` — up to 10, ordered by `playCount DESC`. Published + ready only. Includes songs where this artist is primary **or** featured.
- `albums` — all albums where this artist is the primary. Ordered by `releaseDate DESC` then `title ASC`. No tracklist (call `/albums/:id` for that).

### Edge cases

| Case | Status |
|---|---|
| Unknown artist id | `404 Not Found` |
| Artist exists but has 0 published songs | `200 OK` with `topSongs: []` and `albums: []` (or whatever albums exist) |
| `:id` not a positive integer | `400 Bad Request` |

### curl

```bash
curl http://localhost:3000/api/v1/artists/7 \
  -H 'Authorization: Bearer <accessToken>'
```

## Recommended UI

- Header: name, image (via CloudFront + `imageKey`), bio.
- Section "Popular" — render `topSongs` as a list with play buttons.
- Section "Albums" — render `albums` as a grid of cover images. Tap → `/albums/:id` detail.
