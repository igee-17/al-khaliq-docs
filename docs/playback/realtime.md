---
sidebar_position: 6
---

# Real-time push

Socket.IO namespace that pushes [`/playback/state`](./now-playing-sync.md) updates to every device a user has connected. Complements (does **not** replace) the REST flow — clients that can't maintain a socket still poll.

- **Transport:** Socket.IO (uses WebSocket under the hood, falls back to long-polling automatically on bad networks).
- **Namespace:** `/ws/playback`
- **Direction:** server → client only in v1. Clients read via REST, write via REST; the socket is purely for receiving state fan-out.

## Connecting

```ts
import { io } from 'socket.io-client';

const socket = io('wss://<host>/ws/playback', {
  transports: ['websocket'],
  auth: { token: accessToken },
});

socket.on('state', (state) => {
  // state: PlaybackStateResponseDto (identical shape to GET /playback/state)
  renderNowPlaying(state);
});

socket.on('disconnect', (reason) => {
  // reason === 'io server disconnect' means the server rejected the connection
  // (invalid token, soft-deleted user, etc). Don't auto-reconnect with the same token.
});

socket.on('connect_error', (err) => {
  // Network trouble; socket.io will retry automatically.
});
```

### Authentication

JWT access token via `socket.handshake.auth.token`. The backend:

1. Verifies the signature using the same secret as `/api/v1/*`.
2. Rejects soft-deleted users (401-equivalent → `disconnect`).
3. Joins the socket to a room `user:<userId>`.
4. **Immediately emits the current `state`** on connect — no need to follow up with `GET /playback/state`.

### Token expiry

Access tokens are short-lived (default 15 min). When it expires mid-socket:

- The backend does NOT actively kick the connection — the socket stays open on its initial auth.
- But the REST `/auth/refresh` flow must continue on its own cadence. When the app gets a new access token, disconnect and reconnect with the fresh token (or tolerate the room membership staying keyed on the `userId` from connect-time).
- Simplest client policy: when you refresh the access token, reconnect the socket.

### If a client can't maintain a socket

Just use REST. Call `GET /playback/state` on app foreground or on an explicit "Resume" tap. You'll miss real-time updates while backgrounded, but you'll be current the moment the user engages.

## Events

### Server emits

| Event | Payload | Fired when |
|---|---|---|
| `state` | `PlaybackStateResponseDto` | Every successful `PUT /playback/state` OR server-side upsert (e.g. `POST /playlists/:id/play`). Also on connect with the current state. |
| `exception` | `{ status: 'error', message: string }` | Connection rejected before `disconnect`. |

### Client emits

None in v1. Future: a `ping`-style heartbeat if we need to detect dead connections.

## Fan-out guarantees

- If the user has 3 devices open, all 3 receive the `state` event after any one of them `PUT /playback/state`.
- Cross-user isolation is enforced at the room level — user A's `PUT` never reaches user B's socket.
- Push fires **synchronously within the HTTP handler** — the HTTP `200` response is not returned until the push has been emitted. So if the client awaits the HTTP call, the push has already landed on other devices.

## Scenarios

### Last-writer-wins with live refresh

```
Device A: PUT /playback/state { positionSec: 45 }
                │
                ▼
     Server upserts row, emits 'state' to user:42
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
 Device A   Device B   Device C  ← all receive updated state within ~100ms
```

### New device connects mid-session

```
Device A is playing. Device B opens the app.
Device B: connect('/ws/playback', { auth: { token } })
Server:   emits 'state' with the current row (Device A's state)
Device B: renders "Resume — Song X at 1:14" banner.
```

### Soft-delete invalidation

If the user soft-deletes while a socket is open:

1. The user's `deletedAt` is set.
2. The open socket stays connected until the network drops it or the client disconnects.
3. Any NEW connection attempt with the same (still-signed, not-yet-expired) access token is rejected.

Practical: the soft-delete flow already revokes refresh tokens and forces a re-auth anyway. The open socket window is a corner case.

## Not in scope

- **Client → server events** (e.g. "scrub to 2:30 on my other device from this device"). Use `PUT /playback/state` instead; the push fans out to every connected device.
- **Presence / "other device is playing now" UI** — we don't expose per-device socket counts.
- **Backpressure or message deduplication** — Socket.IO handles reordering and reconnect replay on a best-effort basis; we don't build on top.

## Debugging

- Connect with `wscat -c 'wss://<host>/ws/playback' -H 'auth:{"token":"..."}'` — Socket.IO's default handshake won't work with raw wscat, but a quick Node script using `socket.io-client` does:

```js
const { io } = require('socket.io-client');
const s = io('http://localhost:3000/ws/playback', {
  transports: ['websocket'],
  auth: { token: '<accessToken>' },
});
s.on('state', (m) => console.log('state', m));
s.on('disconnect', (r) => console.log('disconnect', r));
```

- Swagger does not document the socket surface (Swagger is HTTP-only). This page is the source of truth.
