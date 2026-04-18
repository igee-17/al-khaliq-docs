---
sidebar_position: 4
---

# Client vs server responsibilities

The mobile app is the **source of truth for playback state**. The backend only knows what the client tells it.

## What lives on the client

All of the following are local state — don't try to persist them server-side:

- **Queue / "Up next" list** — in memory + on-device storage. Reordering is purely a client gesture.
- **Shuffle flag** — per-session toggle.
- **Repeat mode** — off / repeat-one / repeat-all, per-session.
- **Current playback position within the track** — fed by the platform player (`AVPlayer` / `ExoPlayer`).
- **Which device is currently playing** — if you build multi-device: local only for v1.
- **Downloaded HLS segments** — app sandbox. Client decides when to evict.

## What the server tracks

| Endpoint | Purpose |
|---|---|
| `POST /playback/events` | One row per (user, song, UTC day). Drives `playCount` + `recently_played`. |
| `GET /me/recently-played` | Server-materialised feed; survives reinstall. |

That's it. The backend has no concept of the user's queue or their shuffle state.

## Why this split

- Queue reordering is a high-frequency action. Sending every reorder to the server is wasteful.
- Multi-device resume only needs "what song is currently playing" — that's a separate Phase 5 endpoint. For v1, sessions are device-local.
- Client-side state doesn't survive reinstall — but the only things that matter across reinstalls (recently-played, play counts) are already server-tracked.

## Playback flow summary

```
┌───────────────────────────── client ─────────────────────────────┐
│  User picks a song                                               │
│        │                                                         │
│        ▼                                                         │
│  GET /songs/:id/stream  ────────────► signed URL                 │
│        │                                                         │
│        ▼                                                         │
│  AVPlayer / ExoPlayer plays HLS                                  │
│        │                                                         │
│        ├── time crosses 50%                                      │
│        │   └── POST /playback/events  (once per playback)        │
│        │                                                         │
│        └── user taps next / queue continues                      │
│                                                                  │
│  Queue, shuffle, repeat, reorder — all in-memory on the device   │
└──────────────────────────────────────────────────────────────────┘
```

## Recommendations for queue UX

- Persist the queue to on-device storage (`UserDefaults` + JSON on iOS, DataStore on Android) so it survives app restarts.
- Cap at ~200 items; beyond that, shuffle from a pool rather than a literal list.
- "Play next" inserts at index + 1 of currently-playing.
- "Add to queue" appends at the end.
- "Up next" UI = everything after currently-playing; allow drag-to-reorder.

These are all purely client-side — no backend endpoints needed.
