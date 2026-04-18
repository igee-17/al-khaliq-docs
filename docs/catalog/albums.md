---
sidebar_position: 3
---

# Albums

## GET /albums/:id

Album detail page: cover, release info, and the tracklist (published + ready songs only).

**Requires:** Bearer.

### Response — 200 OK

```json
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
  },
  "songs": [
    PublicSongDto,
    ...
  ]
}
```

- `songs` — every published + ready song on the album, in creation order.
- An album with no published songs still returns 200 (empty `songs` array). The mobile UI can choose to show "Coming soon" or omit the album from its lists.

### Edge cases

| Case | Status |
|---|---|
| Unknown album id | `404 Not Found` |
| Album exists but 0 published songs | `200 OK` with `songs: []` |
| `:id` not a positive integer | `400 Bad Request` |

### curl

```bash
curl http://localhost:3000/api/v1/albums/2 \
  -H 'Authorization: Bearer <accessToken>'
```
