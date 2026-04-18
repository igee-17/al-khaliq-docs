---
sidebar_position: 2
---

# Play events

When the user has listened to **≥ 50%** of a song, fire one event. The backend increments `playCount` and updates the user's recently-played feed.

## POST /playback/events

**Requires:** Bearer.

### Request

```json
{ "songId": 42 }
```

### Response — 204 No Content

No body.

### Rules

- **Fire once per song playback session**, not every few seconds. The client is responsible for detecting the 50% threshold.
- If the user scrubs past 50% immediately, still fire — the backend idempotently deduplicates per `(userId, songId, UTC day)`.
- If the user replays the same song later the same day, fire again — the request is a no-op for `playCount`, but `recently_played` is still bumped.

### Edge cases

| Case | Status |
|---|---|
| Unknown song id | `400 Bad Request` |
| Song unpublished | `400 Bad Request` |
| `songId` sent as a string | `400 Bad Request` |
| Missing body | `400 Bad Request` |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/playback/events \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"songId":42}'
```

## Client-side threshold logic

```ts
player.on('timeupdate', () => {
  const pct = player.currentTime / player.duration;
  if (pct >= 0.5 && !firedForThisPlayback) {
    firedForThisPlayback = true;
    api.post('/playback/events', { songId: currentSongId });
  }
});
player.on('ended', () => { firedForThisPlayback = false; });
player.on('trackchange', () => { firedForThisPlayback = false; });
```

Reset the flag on song-change and on end-of-track so replays don't miss the event.

## What the backend does

- Inserts a `play_events` row with `dayBucket = today (UTC)` if one doesn't exist for `(userId, songId, today)`. On conflict: no-op.
- If (and only if) a row was inserted: increments `Song.playCount` by 1.
- **Always** upserts `recently_played` for `(userId, songId)` with `lastPlayedAt = now()`. Re-listening the same day bumps the song back to the top of [Recently played](./recently-played.md).

## Daily bucketing — why?

Per-play counting invites bots and loops. Per-day bucketing is the industry heuristic for "popular this week/month" leaderboards: spamming replay gains nothing; loyal listeners get weighted naturally over time.
