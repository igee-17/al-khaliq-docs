---
sidebar_position: 1
---

# Songs

## PublicSongDto — shape

Returned by every endpoint that produces songs for the mobile client:

```json
{
  "id": 42,
  "title": "Anybody",
  "slug": "anybody",
  "duration": 247,
  "primaryArtist": {
    "id": 7,
    "name": "Burna Boy",
    "slug": "burna-boy",
    "imageKey": "images/artists/7/cover.jpg"
  },
  "album": {
    "id": 2,
    "title": "African Giant",
    "slug": "african-giant",
    "coverImageKey": "images/albums/2/cover.jpg"
  },
  "featuredArtists": [
    { "id": 9, "name": "Wizkid", "slug": "wizkid", "imageKey": null }
  ],
  "genres": [
    { "id": 3, "name": "Afrobeats", "slug": "afrobeats" }
  ],
  "playCount": 142,
  "releasedAt": "2019-07-26T00:00:00.000Z"
}
```

- `duration` — seconds. Null while the song is still transcoding (not visible to the public anyway).
- `album` — null if the song isn't part of an album.
- `releasedAt` — the album's release date if set, otherwise the song's creation date. Use this for "released in" labels.
- `imageKey` / `coverImageKey` — S3 keys relative to the media bucket (see [Image URLs](#image-urls) below).

## GET /songs/:id

Fetch one song.

**Requires:** Bearer.

### Response — 200 OK

`PublicSongDto` (above).

### Edge cases

| Case | Status |
|---|---|
| Song exists but is unpublished or still transcoding | `404 Not Found` |
| Unknown id | `404 Not Found` |
| `:id` not a positive integer | `400 Bad Request` |

### curl

```bash
curl http://localhost:3000/api/v1/songs/42 \
  -H 'Authorization: Bearer <accessToken>'
```

---

## GET /songs/:id/related

"Related songs" for the now-playing page. Up to 20 items, ranked by:

- **+10 points** for each song by the same primary artist.
- **+5 points per shared genre**.
- Tie-break by `playCount DESC`.

Excludes the song itself and anything unpublished / not-ready.

**Requires:** Bearer.

### Response — 200 OK

```json
[ PublicSongDto, ... ]
```

Up to 20 items. May be fewer (or empty) for songs in small genres with a new artist.

### Edge cases

| Case | Status |
|---|---|
| Unknown song id | `404 Not Found` |
| `:id` not a positive integer | `400 Bad Request` |

---

## Image URLs

Song / album / artist images are returned as S3 keys (e.g. `images/artists/7/cover.jpg`). The full image URL is:

```
https://<AWS_CLOUDFRONT_DISTRIBUTION_DOMAIN>/<imageKey>
```

The distribution domain is environment-specific — ask backend for the right one per environment. Images are publicly readable through CloudFront (no signed URLs needed for images — only audio is protected).

## When to fetch the stream URL

Do **not** fetch a streaming URL per song in list responses. Song listings don't include stream URLs — they'd expire before the user actually taps a song. Instead, call `GET /songs/:id/stream` at the moment playback starts. See [Playback → Streaming](../playback/streaming.md).
