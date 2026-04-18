# Playback

## Endpoint

`GET /api/v1/songs/:id/stream` (authenticated user).

- Requires `Song.status = READY` AND `Song.publishedAt != null`.
- Returns a short-lived signed CloudFront URL for the HLS manifest.

Response:

```json
{
  "streamUrl": "https://d1234567890abc.cloudfront.net/hls/42/main.m3u8?Expires=...&Signature=...&Key-Pair-Id=...",
  "expiresAt": "2026-04-18T14:32:01.333Z",
  "duration": 247
}
```

Errors:
- `404` — song not found.
- `403` — song exists but isn't `READY` or hasn't been published.

## How signing works

- An RSA key pair is generated with OpenSSL.
- The **public key** is uploaded to CloudFront; AWS gives back a Key Pair ID.
- The **private key** is stored in the backend's env as `AWS_CLOUDFRONT_PRIVATE_KEY` (PEM, newlines escaped as `\n`).
- The CloudFront distribution has a cache behaviour that requires signed URLs via a trusted key group containing that key.
- `CloudFrontSignerService` calls the AWS SDK's `getSignedUrl()` helper with a 10-minute TTL.

## Why 10 minutes?

Long enough for the player to fetch every segment of almost any track off the same signed base URL (HLS clients re-use the URL for all segment requests). Short enough that a leaked URL is useless quickly.

For longer tracks or slow networks, bump the TTL in `src/playback/playback.service.ts`.

## Client playback

- **iOS:** native `AVPlayer` plays HLS out of the box. Pass the `streamUrl` to `AVURLAsset`.
- **Android:** `ExoPlayer` supports HLS via `HlsMediaSource.Factory`.

Both handle the 3 bitrate rungs automatically, switching based on network conditions.
