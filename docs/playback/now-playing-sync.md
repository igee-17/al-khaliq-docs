---
sidebar_position: 5
---

# Cross-device "now playing" sync

One row per user, last-writer-wins. Device A writes what's playing; Device B reads and resumes. State updates are pushed to every connected device via the [Socket.IO gateway](./realtime.md) — polling is a fallback for clients that can't hold a socket.

## Mental model

- **Single row per user.** Not per-device. Writing from Device B silently overwrites whatever Device A wrote.
- **Full-state-replace semantics.** Every `PUT` represents the client's complete intended state — fields omitted from the body reset to defaults, they do **not** preserve prior values.
- **Queue lives here.** `queueSongIds` + `currentIndex` are synced. Shuffle order is encoded in the queue itself. Repeat mode stays client-local.
- **Push + polling.** Real-time updates via [`/ws/playback`](./realtime.md). Clients that can't or choose not to maintain a socket fall back to reading `GET /playback/state` on app foreground / explicit resume.

See [client vs server responsibilities](./client-server-split.md) for where this fits in the overall playback model.

## The shape

```ts
{
  songId: number | null;
  song: PublicSongDto | null;      // hydrated (null if songId is null or song was unpublished / deleted)
  positionSec: number;             // seconds into the track, >= 0
  isPaused: boolean;
  deviceId: string | null;         // client-chosen display label e.g. "iPhone 15 Pro"
  queueSongIds: number[];          // up to 500 ids, in play order
  queueSongs: PublicSongDto[];     // hydrated; ids that no longer resolve are skipped
  currentIndex: number | null;     // 0-based index into queueSongIds
  updatedAt: string | null;        // ISO; null if the user has never written state
}
```

---

## GET /playback/state

Returns the caller's current state. **Always 200**, even if the user has never written playback state — an empty record is returned, not a 404.

**Requires:** Bearer.

### Response — 200 OK (never written)

```json
{
  "songId": null,
  "song": null,
  "positionSec": 0,
  "isPaused": false,
  "deviceId": null,
  "queueSongIds": [],
  "queueSongs": [],
  "currentIndex": null,
  "updatedAt": null
}
```

### Response — 200 OK (written previously)

```json
{
  "songId": 42,
  "song": { "id": 42, "title": "…", "… PublicSongDto fields": "…" },
  "positionSec": 74,
  "isPaused": false,
  "deviceId": "iPhone 15 Pro",
  "queueSongIds": [41, 42, 43],
  "queueSongs": [
    { "id": 41, "title": "…" },
    { "id": 42, "title": "…" },
    { "id": 43, "title": "…" }
  ],
  "currentIndex": 1,
  "updatedAt": "2026-04-18T22:31:00.333Z"
}
```

### Hydration drift

`queueSongs.length` may be less than `queueSongIds.length` if songs were unpublished or deleted between the last PUT and this GET. Compare lengths — if they differ, you can either keep the raw id list as-is or issue a fresh `PUT` with only the resolved ids.

### curl

```bash
curl http://localhost:3000/api/v1/playback/state \
  -H 'Authorization: Bearer <accessToken>'
```

---

## PUT /playback/state

Upsert the full playback state. **This is a complete replacement** — whatever you send is what the row becomes.

**Requires:** Bearer.

### Request body

All fields are optional, but omitted fields reset to their default (not "keep the previous value"):

```ts
{
  songId?: number | null;          // default: null
  positionSec?: number;            // default: 0
  isPaused?: boolean;              // default: false
  deviceId?: string | null;        // default: null, max 80 chars
  queueSongIds?: number[];         // default: [], max 500 entries
  currentIndex?: number | null;    // default: null
}
```

### Response — 200 OK

Same shape as `GET` above, with the stored values reflected.

### Validation rules

| Rule | Status |
|---|---|
| `songId` must be a published, ready song | `400` |
| Every `queueSongIds` entry must be a published, ready song | `400` |
| `queueSongIds` longer than 500 entries | `400` |
| `currentIndex` set but `queueSongIds` is empty | `400` |
| `currentIndex` out of range (`< 0` or `>= queueSongIds.length`) | `400` |
| `positionSec` negative or non-integer | `400` |
| `deviceId` longer than 80 chars | `400` |
| Any extra / undeclared field in the body | `400` |

### Typical client patterns

| Scenario | What to PUT |
|---|---|
| Track change | `{ songId, positionSec: 0, isPaused: false, queueSongIds, currentIndex, deviceId }` |
| Pause | `{ …same state…, isPaused: true }` |
| Seek | `{ …same state…, positionSec: <new> }` |
| Tick every ~10s while playing | `{ …same state…, positionSec: <new> }` |
| Queue reorder | `{ …same state…, queueSongIds: <new order>, currentIndex: <new index> }` |
| User idle | Stop writing; state ages naturally |

**Do not PUT on every playhead movement.** A 10-second cadence while playing is enough — each PUT is ≤1 KB and the global rate limiter is 60/min, but tighter cadences waste bandwidth.

### Full-state-replace reminder

The server does not merge — it replaces. If you only send `{ positionSec: 30 }`:

- `songId` becomes `null`
- `queueSongIds` becomes `[]`
- `isPaused` becomes `false`
- `deviceId` becomes `null`

Always hold the full state in memory client-side and write the complete snapshot.

### curl

```bash
curl -X PUT http://localhost:3000/api/v1/playback/state \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "songId": 42,
    "positionSec": 45,
    "isPaused": false,
    "deviceId": "iPhone 15 Pro",
    "queueSongIds": [41, 42, 43],
    "currentIndex": 1
  }'
```

---

## POST /playlists/:id/play and POST /albums/:id/play

Atomic "play this whole playlist / album" helpers. The server:

1. Resolves the playlist (ownership + visibility checks) or album.
2. Filters to published + ready songs.
3. Builds the queue per the shuffle/startIndex rules below.
4. Upserts `PlaybackState` in one round-trip.
5. Fans the new state out to every connected [Socket.IO client](./realtime.md).

Saves the client from having to fetch detail + compose + `PUT /playback/state` in three steps.

**Requires:** Bearer.

### Request body (shared `PlayAllDto`)

```ts
{
  shuffle?: boolean;      // default false
  startIndex?: number;    // default 0 (play from the top)
  deviceId?: string;      // optional label, max 80 chars
}
```

### Queue-building rules

| `shuffle` | `startIndex` | Resulting queue |
|---|---|---|
| `false` | `undefined` | Natural order. |
| `false` | `k` | `songs[k]` at position 0; remaining songs stay in natural order after it (rotation). |
| `true` | `undefined` | Full Fisher–Yates shuffle. |
| `true` | `k` | `songs[k]` pinned at position 0; the rest is Fisher–Yates shuffled. |

`startIndex` indexes into the **filtered** (published+ready) list, not the raw playlist. So if a playlist has `[a, unpublished, b, c]`, the filtered list is `[a, b, c]`, and `startIndex: 1` means start at `b`.

### Response — 200 OK

`PlaybackStateResponseDto` (same shape as `GET /playback/state`).

### Edge cases

| Case | Status |
|---|---|
| Playlist empty (or has no playable songs) | `400` |
| Album has no published songs | `400` |
| `startIndex` >= filtered-list length | `400` |
| Playlist is another user's private playlist | `404` |
| Album / playlist doesn't exist | `404` |

### curl

```bash
# Play whole playlist in natural order
curl -X POST http://localhost:3000/api/v1/playlists/7/play \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{}'

# Tap "Shuffle play" on an album
curl -X POST http://localhost:3000/api/v1/albums/4/play \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"shuffle": true, "deviceId": "iPhone 15 Pro"}'

# "Play from this track" inside a playlist detail
curl -X POST http://localhost:3000/api/v1/playlists/7/play \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"startIndex": 2, "shuffle": true}'
```

---

## DELETE /playback/state

Clear the row entirely. Useful for an explicit "Stop and forget" UX (logout, "Clear playback" setting).

**Requires:** Bearer.

### Response — 204 No Content

No body. **Idempotent** — returns 204 even if no row exists.

### curl

```bash
curl -X DELETE http://localhost:3000/api/v1/playback/state \
  -H 'Authorization: Bearer <accessToken>'
```

---

## Design notes

### Why one row per user, not per device?

Last-writer-wins is the simplest model the mobile app spec needs: "resume where I left off on this other device." Per-device rows would require a device-picker UI ("Transfer to iPhone") which isn't in scope for v1.

### Push + polling

Every successful `PUT /playback/state` (and every server-atomic `POST /playlists/:id/play` / `POST /albums/:id/play`) fans out to every connected device via [`/ws/playback`](./realtime.md). Clients that can't or don't maintain a socket fall back to `GET` on demand. See the [realtime doc](./realtime.md) for the Socket.IO handshake, auth, and guarantees.

### Why is the queue synced but shuffle / repeat are not?

The shuffled play order is already encoded in the order of `queueSongIds`. Repeat is a UI preference for the currently-listening session — sending it would create confusing cross-device behaviour (Device A's "repeat one" affecting Device B's auto-advance).

### Staleness

There is no server-side TTL. A row that was written weeks ago still reads back. Clients should inspect `updatedAt`:

- `< 1 hour` → show "Resume" prominently.
- `< 1 day` → show "Last played at HH:mm".
- `> 1 week` → maybe don't surface the resume UI at all.

### Rate limiting

Falls under the global 60/min throttler. A ~10s tick cadence stays comfortably inside that.

---

## Recommended client flow

```
┌───────── Device A (currently playing) ─────────┐
│                                                │
│  On track change / pause / seek / ~10s tick:   │
│    PUT /playback/state { full snapshot }       │
│                                                │
└────────────────────────────────────────────────┘

┌───────── Device B (just opened) ───────────────┐
│                                                │
│  App foreground → GET /playback/state          │
│    - If updatedAt < 1h and songId set:         │
│        show "Resume on this device" banner     │
│    - On tap: start playback at positionSec     │
│              with the synced queue + index     │
│    - Device B's first PUT silently takes over  │
│                                                │
└────────────────────────────────────────────────┘
```
