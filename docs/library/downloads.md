---
sidebar_position: 9
---

# Downloads

Per-user download **tracking**. The backend records which songs the client has cached locally so the app can:

- Render the "Downloaded" icon on song rows.
- Show a "Downloaded" screen / rail.
- Remember across reinstall that the user wants these songs available offline (so the app can re-download them automatically once reinstalled).

**The backend does not store the audio.** The client downloads HLS segments via [iOS `AVAssetDownloadURLSession`](https://developer.apple.com/documentation/avfoundation/avassetdownloadurlsession) / [Android ExoPlayer `DownloadManager`](https://developer.android.com/reference/androidx/media3/exoplayer/offline/DownloadManager) into the app sandbox. These endpoints are only a flag.

No DRM — catalog is own-content only.

## Typical client flow

```
user taps "Download" on a song
    ↓
client fetches /songs/:id/stream → gets signed CloudFront URL
    ↓
client starts platform download manager (AVAssetDownloadURLSession / ExoPlayer)
    ↓
on successful completion:
    POST /me/downloads { songId }
    ↓
client keeps the local file path, renders "downloaded" icon on future lists
```

On eviction (user frees up space, or song removed from catalog):

```
client deletes local files
    ↓
DELETE /me/downloads/:songId
```

## POST /me/downloads

Record a download.

**Requires:** Bearer.

### Request

```json
{ "songId": 42 }
```

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song already marked downloaded | **409** |
| Song doesn't exist or isn't published + ready | **400** |

---

## DELETE /me/downloads/:songId

Mark a download as evicted.

### Response — 204 No Content

| Case | Status |
|---|---|
| No download record for this song | 404 |

---

## GET /me/downloads

List downloaded songs, most-recently-downloaded first.

### Query

- `?limit=` — default 50, max 500.

### Response — 200 OK

```json
[
  {
    "song": PublicSongDto,
    "downloadedAt": "2026-04-18T14:22:01.333Z"
  },
  ...
]
```

Each entry wraps the song with its `downloadedAt` timestamp — useful for rendering "downloaded 3 days ago". Songs that have since been unpublished are silently filtered out (the row is retained for idempotency).

---

## GET /me/downloads/status?songIds=1,2,3

Batch-check which of the given songs the user has downloaded. For rendering download icons on song lists.

### Response — 200 OK

```json
{ "downloaded": [1, 3] }
```

Same 1–100 ids rule as the other status endpoints.

## Recommended UX

- Song row's "Download" affordance:
  - Not downloaded → tap → kick off platform download + `POST /me/downloads` on success. Show progress while downloading.
  - Downloaded → tap → confirm "Remove download?" → evict locally + `DELETE /me/downloads/:songId`.
  - Shelf-life: if the user doesn't open the app for months, local files may be evicted by the OS. Client should revalidate on next launch: for any song in `GET /me/downloads` whose local file is missing, re-download silently in the background.
- Library → "Downloaded" screen: `GET /me/downloads` → render with a "Play" / "Manage" option.
- Offline mode: if the device is offline and the user taps a song not in the downloads list, the app should show "Not available offline".
