# Play events

## The rule

A song counts as "played" once the user has consumed **≥ 50% of its duration**. The mobile client is the source of truth for the threshold — it fires `POST /api/v1/playback/events` when playback position crosses 50%.

## Endpoint

```
POST /api/v1/playback/events
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "songId": 42 }
```

Response: `204 No Content`.

## Idempotency

One user × one song × one UTC day increments `playCount` **exactly once**, regardless of how many times the client fires the event that day.

Implementation:

```sql
INSERT INTO play_events (user_id, song_id, day_bucket, created_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, song_id, day_bucket) DO NOTHING
RETURNING id;
```

If a row comes back, we inserted → in the same transaction, `UPDATE songs SET play_count = play_count + 1 WHERE id = $2`.
If no row → we already counted today → no-op.

## Why daily bucketing

Per-play counting invites bots. Per-day bucketing is the industry heuristic for "popular songs this week / month" leaderboards — spamming replay gains nothing; loyal listeners get weighted naturally over time.

## Growth

`play_events` grows by one row per `(user, song)` pair per active day. A cleanup job (Phase 2+) will purge rows older than N months; `play_count` on `Song` is the permanent aggregate.
