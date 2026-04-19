---
sidebar_position: 7
---

# Pins

Pin songs to the home screen. Powers the "Pin to home" action in the 3-dot song menu and the "Pinned" rail on the home screen.

**Cap:** 20 pins per user. The 21st pin returns 409 — the client should show a "Pin full" UX with an option to unpin something.

## POST /me/pins

Pin a song.

**Requires:** Bearer.

### Request

```json
{ "songId": 42 }
```

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song already pinned | **409** |
| Already at 20 pins | **409** (`"Pin cap of 20 reached..."`) |
| Song doesn't exist or isn't published + ready | **400** |

### curl

```bash
curl -X POST http://localhost:3000/api/v1/me/pins \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"songId":42}'
```

---

## DELETE /me/pins/:songId

Unpin.

### Response — 204 No Content

### Edge cases

| Case | Status |
|---|---|
| Song is not pinned | 404 |

---

## GET /me/pins

List pinned songs, most-recently-pinned first.

### Response — 200 OK

```json
[ PublicSongDto, PublicSongDto, ... ]
```

- Ordered by `pinnedAt DESC`.
- Songs that have since been unpublished are silently filtered out (the pin row is retained; the song re-appears if published again).

### curl

```bash
curl http://localhost:3000/api/v1/me/pins \
  -H 'Authorization: Bearer <accessToken>'
```

---

## GET /me/pins/status?songIds=1,2,3

Batch-check which of the given songs are pinned — for rendering pin-state icons on a song list screen.

### Query

- `?songIds=` — comma-separated positive integer song ids. **1–100 ids max**.

### Response — 200 OK

```json
{ "pinned": [1, 3] }
```

### Edge cases

| Case | Status |
|---|---|
| `songIds` missing / empty | 400 |
| More than 100 ids | 400 |
| Duplicate ids in the query | 400 |
| Non-integer ids | 400 |

## Recommended UX

- 3-dot menu "Pin to home" → `POST /me/pins`. On 409 at cap: show a sheet listing current pins and let the user swap.
- Home screen's top rail: `GET /me/pins` rendered as a horizontal scroll, most-recent first. Long-press an item → "Unpin" action → `DELETE /me/pins/:songId`.
- Song list screens that want to show a "pinned" badge: call `GET /me/pins/status?songIds=…` with the visible ids once (not per-song).
