---
sidebar_position: 1
---

# HLS streaming

## GET /songs/:id/stream

Returns a plain manifest URL and three **CloudFront signed cookies** that authorise the browser or native player to fetch the master playlist, every sub-playlist, and every audio segment for the song.

**Requires:** Bearer.

### Why cookies instead of a signed URL?

An HLS master playlist references sub-playlists by relative path (`original_96k.m3u8`, `original_160k.m3u8`, `original_320k.m3u8`). The player resolves those relative to the manifest URL and fires separate requests for each. A signed URL only covers the exact resource it was signed for — sub-playlist and segment requests arrive at CloudFront unsigned and are rejected with 403.

Signed cookies cover a path prefix (`hls/42/*`) and are sent automatically on every request to the distribution domain, so the player has no special work to do.

### Response — 200 OK

```json
{
  "manifestUrl": "https://dkja3axlhvjtb.cloudfront.net/hls/42/original.m3u8",
  "cookies": {
    "CloudFront-Key-Pair-Id": "K2X1SZPT1KN8WR",
    "CloudFront-Policy": "eyJTdGF0ZW1lbnQi...",
    "CloudFront-Signature": "NmT3iwUo~..."
  },
  "expiresAt": "2026-04-18T14:32:01.333Z",
  "duration": 247
}
```

- `manifestUrl` — unsigned URL for the HLS master playlist. Do **not** load this directly without the cookies — CloudFront will return 403.
- `cookies` — all three must be attached to every request sent to `dkja3axlhvjtb.cloudfront.net`. They cover the entire `hls/{songId}/` prefix.
- `expiresAt` — ISO 8601 UTC. Re-fetch the stream endpoint before this time if the player is still active.
- `duration` — seconds, used to show a progress bar before the player reports duration.

### Edge cases

| Case | Status | Meaning |
|---|---|---|
| Song exists but is unpublished or still transcoding | `403 Forbidden` | Treat the same as 404. |
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

`AVPlayer` on iOS and `ExoPlayer` on Android handle bitrate switching natively.

## Cookie lifetime

Cookies are signed for **10 minutes** and cover the path prefix `hls/{songId}/*`.

For songs longer than 10 minutes, re-fetch `/songs/:id/stream` before `expiresAt` and update the cookies on the player's HTTP client. The player itself does not need to be restarted.

## iOS example (AVFoundation)

Register the cookies with `HTTPCookieStorage` before creating the asset. `AVPlayer` picks them up automatically from the shared storage.

```swift
import AVFoundation

struct StreamResponse: Decodable {
  let manifestUrl: String
  let cookies: [String: String]
  let expiresAt: Date
  let duration: Int?
}

func play(songId: Int) async throws {
  let res: StreamResponse = try await api.get("/songs/\(songId)/stream")

  // Register cookies so AVPlayer's network stack sends them automatically.
  let cfDomain = "dkja3axlhvjtb.cloudfront.net"
  for (name, value) in res.cookies {
    if let cookie = HTTPCookie(properties: [
      .name: name,
      .value: value,
      .domain: cfDomain,
      .path: "/hls/\(songId)/",
      .secure: "TRUE",
    ]) {
      HTTPCookieStorage.shared.setCookie(cookie)
    }
  }

  let url = URL(string: res.manifestUrl)!
  let asset = AVURLAsset(url: url)
  let item = AVPlayerItem(asset: asset)
  player.replaceCurrentItem(with: item)
  player.play()
}
```

## Android example (ExoPlayer / Media3)

Pass the cookies as HTTP headers to `DefaultHttpDataSource`. CloudFront accepts them in the `Cookie` header the same way as actual browser cookies.

```kotlin
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.hls.HlsMediaSource

data class StreamResponse(
  val manifestUrl: String,
  val cookies: Map<String, String>,
  val expiresAt: String,
  val duration: Int?,
)

fun play(songId: Int) {
  val res = api.getStreamUrl(songId) // your Retrofit/Ktor call

  val cookieHeader = res.cookies.entries.joinToString("; ") { "${it.key}=${it.value}" }
  val dataSourceFactory = DefaultHttpDataSource.Factory()
    .setDefaultRequestProperties(mapOf("Cookie" to cookieHeader))

  val mediaItem = MediaItem.fromUri(res.manifestUrl)
  val mediaSource = HlsMediaSource.Factory(dataSourceFactory)
    .createMediaSource(mediaItem)

  exoPlayer.setMediaSource(mediaSource)
  exoPlayer.prepare()
  exoPlayer.playWhenReady = true
}
```

## Web example (hls.js)

Set the cookies on the CloudFront domain via `document.cookie`, then configure `hls.js` with `withCredentials: true` so every XHR request includes them.

```ts
import Hls from 'hls.js';

interface StreamResponse {
  manifestUrl: string;
  cookies: Record<string, string>;
  expiresAt: string;
  duration: number | null;
}

async function play(songId: number, audioEl: HTMLAudioElement) {
  const res: StreamResponse = await fetch(`/api/v1/songs/${songId}/stream`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(r => r.json());

  // Write cookies onto the CloudFront domain so the browser sends them
  // automatically on sub-playlist and segment requests.
  for (const [name, value] of Object.entries(res.cookies)) {
    document.cookie = `${name}=${value}; domain=dkja3axlhvjtb.cloudfront.net; path=/hls/${songId}/; secure; samesite=none`;
  }

  if (Hls.isSupported()) {
    const hls = new Hls({ xhrSetup: xhr => { xhr.withCredentials = true; } });
    hls.loadSource(res.manifestUrl);
    hls.attachMedia(audioEl);
  } else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari native HLS — cookies are in shared storage, no extra config needed.
    audioEl.src = res.manifestUrl;
  }

  audioEl.play();
}
```

> **Note:** Writing cookies to a cross-origin domain from JS only works when the CloudFront distribution sends `Access-Control-Allow-Origin` with the app's origin and `Access-Control-Allow-Credentials: true`. If the web client is same-origin as the API (e.g. proxied), the server can set the cookies via `Set-Cookie` response headers instead.

## Download for offline

1. Request `/songs/:id/stream`.
2. Use the signed cookies with your HLS client's offline download facility (iOS: `AVAssetDownloadURLSession`; Android: ExoPlayer's `DownloadManager`) to cache segments locally.
3. Store the local path per song id so offline playback points to the cached files.

There's no DRM — cached files are app-sandbox-protected but readable by a determined user. Acceptable because the catalog is own-content only.
