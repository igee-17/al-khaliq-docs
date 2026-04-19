---
sidebar_position: 2
---

# Play events

Three event types the client can fire to signal how a playback ended. The backend uses these to drive `playCount`, `recently_played`, and the recommendation exclusion set.

## POST /playback/events

**Requires:** Bearer.

### Request

```json
{ "songId": 42, "eventType": "THRESHOLD" }
```

`eventType` is optional and defaults to `"THRESHOLD"` for backward compatibility. Values:

| Event | Fire when | Effect on `playCount` | Effect on `recently_played` | Effect on recs |
|---|---|---|---|---|
| `THRESHOLD` | User listened ≥ 50% of the track | +1 (once per user/song/day) | bumped to `now()` | Song is excluded from future quick-picks + explore recs |
| `COMPLETED` | Track played to the end | unchanged | bumped to `now()` | Song is excluded from future recs |
| `SKIPPED` | User tapped next / abandoned before 50% | unchanged | unchanged | **Not** excluded on a single skip. [3 skips within 30 days](../discovery/home.md#over-skipped-heuristic) **does** exclude. |

### Response — 204 No Content

### Rules

- **Fire at most one `THRESHOLD` event per track playback** (on crossing 50%, not every few seconds).
- **Fire `COMPLETED` on `ended`** — player hit the end-of-track.
- **Fire `SKIPPED` when the user intentionally advances before 50%** (tap next, swipe, stop). Don't fire on app backgrounding or network errors.
- A single track can produce multiple event types on the same day — e.g. `THRESHOLD` then `COMPLETED` → both are recorded, `playCount` increments once (on `THRESHOLD`), `recently_played` bumps twice.
- Server deduplicates per `(userId, songId, dayBucket, eventType)`. A second identical event same day is a no-op.
- **Legacy `{ songId }` without `eventType` still works** — treated as `THRESHOLD`.

### Edge cases

| Case | Status |
|---|---|
| Unknown song id | `400` |
| Song unpublished | `400` |
| `songId` sent as a string | `400` |
| Unknown `eventType` value | `400` |
| Missing body | `400` |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/playback/events \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"songId":42, "eventType":"THRESHOLD"}'
```

## Client-side event logic

```ts
let firedThreshold = false;

player.on('timeupdate', () => {
  const pct = player.currentTime / player.duration;
  if (pct >= 0.5 && !firedThreshold) {
    firedThreshold = true;
    api.post('/playback/events', { songId: currentSongId, eventType: 'THRESHOLD' });
  }
});

player.on('ended', () => {
  api.post('/playback/events', { songId: currentSongId, eventType: 'COMPLETED' });
  firedThreshold = false;
});

player.on('userSkip', () => {
  // only if the user was < 50% of the way in
  if ((player.currentTime / player.duration) < 0.5) {
    api.post('/playback/events', { songId: currentSongId, eventType: 'SKIPPED' });
  }
  firedThreshold = false;
});

player.on('trackchange', () => { firedThreshold = false; });
```

## Why three types?

- **`THRESHOLD`** — the canonical "this user played this song" signal. Drives `playCount` (popular lists) and exclusion from recs (don't recommend something they've already heard).
- **`COMPLETED`** — stronger engagement signal than crossing 50%. Drives `recently_played` bumping; future phases may use it to weight "songs you finish to the end" in personalisation.
- **`SKIPPED`** — negative signal. A single skip is permissive (user may come back tomorrow), but repeated skips override the default "don't exclude" rule. See [Home → over-skipped heuristic](../discovery/home.md#over-skipped-heuristic).

## Daily bucketing — why?

Per-play counting invites bots and loops. Per-day bucketing is the industry heuristic for "popular this week/month" leaderboards: spamming replay gains nothing; loyal listeners get weighted naturally over time.

The unique key is `(userId, songId, dayBucket, eventType)` — so the same user can record one of each type per day for the same song. The THRESHOLD dedup is the one that guards `playCount`.

## Recently-played interaction

`THRESHOLD` and `COMPLETED` both bump `recently_played` to `now()` on **every** call, not just the first of the day. So replaying a song later today pushes it back to the top of the user's history.

`SKIPPED` never bumps `recently_played`.

See [Recently played](./recently-played.md) for the read endpoint.
