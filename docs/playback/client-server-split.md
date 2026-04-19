---
sidebar_position: 4
---

# Client vs server responsibilities

The mobile app is the **source of truth for active playback state**. The backend only knows what the client tells it — but for cross-device "resume where I left off", the client writes a compact snapshot to the server via [`/playback/state`](./now-playing-sync.md).

## What lives only on the client

Per-session UI state — don't try to persist these server-side:

- **Current playback position within the track** — fed by the platform player (`AVPlayer` / `ExoPlayer`) at 60fps. Only a periodic snapshot (~10s) goes to the server.
- **Shuffle flag** — the *toggle* is local; the *shuffled order* is encoded in `queueSongIds` when written to the server.
- **Repeat mode** — off / repeat-one / repeat-all, per-session.
- **Downloaded HLS segments** — app sandbox. Client decides when to evict.

## What the server tracks

| Endpoint | Purpose |
|---|---|
| `POST /playback/events` | One row per (user, song, UTC day). Drives `playCount` + `recently_played`. |
| `GET /me/recently-played` | Server-materialised feed; survives reinstall. |
| `PUT /GET /DELETE /playback/state` | Cross-device "now playing" snapshot — current song, position, queue, index. See [Now-playing sync](./now-playing-sync.md). |

The `/playback/state` row is **last-writer-wins**, one row per user. The backend has no concept of per-device playback, shuffle toggle, or repeat mode — those stay on the client.

## Why this split

- Queue reordering is a high-frequency action *within* a session. Sending every scrub or 60fps tick to the server is wasteful — batching into a ~10s snapshot is enough for resume.
- Cross-device resume only needs "what song is currently playing, where, and what's up next" — that's exactly what [`/playback/state`](./now-playing-sync.md) stores.
- Client-side state doesn't survive reinstall — but the things that matter across reinstalls (recently-played, play counts, the now-playing snapshot) are all server-tracked.

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
│  Queue reorder, shuffle toggle, repeat mode — all local to the   │
│  session. A ~10s tick PUTs the snapshot to /playback/state for   │
│  cross-device resume.                                            │
└──────────────────────────────────────────────────────────────────┘
```

## Recommendations for queue UX

- Hold the active queue + current index in memory and mirror it to on-device storage (`UserDefaults` + JSON on iOS, DataStore on Android) so it survives app restarts even when offline.
- Cap the server-synced queue at **500 items** (the `/playback/state` limit). If the local queue is longer, truncate from `currentIndex` when writing.
- "Play next" inserts at `currentIndex + 1`.
- "Add to queue" appends at the end.
- "Up next" UI = everything after `currentIndex`; allow drag-to-reorder.
- On track change / pause / seek / every ~10s while playing, PUT the full state. See [Now-playing sync](./now-playing-sync.md) for the exact shape.
