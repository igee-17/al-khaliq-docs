---
sidebar_position: 5
---

# Playback: client vs server split

The mobile app is the **source of truth for playback state**. The backend only knows what the client tells it, and only keeps what's needed for cross-device continuity and analytics.

## What lives on the client

- **Queue** (what's up next) — in-memory, persisted to on-device storage.
- **Shuffle flag** — per-session, client state.
- **Repeat mode** — per-session, client state.
- **Current playback position within the track** — fed by the platform player (AVPlayer / ExoPlayer).
- **"Up next" ordering + reordering** — purely client-side drag handling.
- **Downloaded tracks cache** — HLS segments written to the app's sandbox. Client decides when to evict.

## What the server tracks

- **"Currently playing"** — single row per user: `{ songId, position, deviceId, updatedAt }`. Upserted by the client so another device can fetch and resume.
- **Recently played** — last N distinct songs played by this user. Backed by `PlayEvent`.
- **Play events** — `{ userId, songId, dayBucket }` uniques. One row per active listening day.

## Why this split

- A reorderable queue is a local-first UX concern; syncing it across devices adds work that most users never notice.
- Keeping the queue off the server reduces write load (users reorder a lot).
- Cross-device resume only needs the active-playing row, which is tiny and updated at human speed.

## Endpoints (Phase 5 — not in Phase 1 scope)

```
POST /api/v1/playback/state       { songId, position, deviceId }   upsert "currently playing"
GET  /api/v1/playback/state                                          fetch most-recent "currently playing"
GET  /api/v1/playback/recent                                         last N played songs
```

Phase 1 ships only `POST /api/v1/playback/events` (see [Catalog → Play events](./catalog/play-events.md)).
