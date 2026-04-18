---
sidebar_position: 1
---

# HLS streaming

## GET /songs/:id/stream

Returns a short-lived signed CloudFront URL for the song's HLS master playlist.

**Requires:** Bearer.

### Response — 200 OK

```json
{
  "streamUrl": "https://d1234567890abc.cloudfront.net/hls/42/main.m3u8?Expires=…&Signature=…&Key-Pair-Id=…",
  "expiresAt": "2026-04-18T14:32:01.333Z",
  "duration": 247
}
```

- `streamUrl` — feed this directly to the platform player. HLS master playlist; player picks the right bitrate rung automatically.
- `expiresAt` — ISO 8601 UTC, 10 minutes after issue.
- `duration` — seconds.

### Edge cases

| Case | Status | Meaning |
|---|---|---|
| Song exists but is unpublished or still transcoding | `403 Forbidden` | Rare — normally unpublished songs are also absent from `/songs/:id` (which 404s). If you somehow have an id for an unpublished song, treat 403 the same as 404. |
| Unknown song id | `404 Not Found` | |
| `:id` not a positive integer | `400 Bad Request` | |

### curl

```bash
curl http://localhost:3000/api/v1/songs/42/stream \
  -H 'Authorization: Bearer <accessToken>'
```

## Bitrate rungs

Every song is encoded at three bitrates. The HLS master manifest lists all three and the player adapts based on network conditions:

| Rung | Bitrate | Target |
|---|---|---|
| Low | 96 kbps AAC-LC | 2G / metered cellular |
| Mid | 160 kbps AAC-LC | Typical mobile |
| High | 320 kbps AAC-LC | Wi-Fi / unmetered |

You don't need to pick — `AVPlayer` on iOS and `ExoPlayer` on Android handle switching natively.

## URL lifetime

- Signed for **10 minutes**.
- HLS segment requests are signed against the same query string — the player doesn't need to re-fetch a URL per segment.
- If a song is longer than 10 minutes and playback is still going, the signature may expire mid-playback. The player will fail the next segment. **Handle this by re-fetching `/songs/:id/stream` when the player surfaces a segment load error** — quickly enough that the user doesn't notice.

## iOS example

```swift
import AVFoundation

func play(songId: Int) async throws {
  let res: StreamResponse = try await api.get("/songs/\(songId)/stream")
  let url = URL(string: res.streamUrl)!
  let asset = AVURLAsset(url: url)
  let item = AVPlayerItem(asset: asset)
  player.replaceCurrentItem(with: item)
  player.play()
}
```

## Android example

```kotlin
val response = api.getStreamUrl(songId)
val mediaItem = MediaItem.fromUri(response.streamUrl)
val mediaSource = HlsMediaSource.Factory(httpDataSourceFactory)
  .createMediaSource(mediaItem)
exoPlayer.setMediaSource(mediaSource)
exoPlayer.prepare()
exoPlayer.playWhenReady = true
```

## Web example (hls.js)

```ts
import Hls from 'hls.js';

const video = document.querySelector('audio')!;
const res = await fetch('/api/v1/songs/42/stream', {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json());

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(res.streamUrl);
  hls.attachMedia(video);
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  // Safari native HLS
  video.src = res.streamUrl;
}
video.play();
```

## Download for offline

The app spec has a "Download" action on each song. For v1, "download" means:

1. Request `/songs/:id/stream`.
2. Use your HLS client's offline download facility (iOS: `AVAssetDownloadURLSession`; Android: ExoPlayer's `DownloadManager`) to cache segments locally.
3. Remember the local path per song id so offline playback points to the cached files instead of the network.

There's no DRM — the cached files are app-sandbox-protected but readable by a determined user. Acceptable because the catalog is own-content only.
