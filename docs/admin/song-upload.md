---
sidebar_position: 4
---

# Song upload pipeline

Five endpoints orchestrating the full flow: create metadata → upload file to S3 → kick off transcoding → publish.

Both `SUPER_ADMIN` and `CONTENT_ADMIN` can call all of these. All require admin Bearer.

## Status lifecycle

```
PENDING_UPLOAD  → row created, no source file yet
      │
      │  POST /admin/songs/:id/upload-url   → presigned S3 PUT
      │  admin PUTs raw audio to S3 directly (no backend passthrough)
      │
      │  POST /admin/songs/:id/complete-upload
      ▼
PROCESSING      → MediaConvert job submitted; backend is waiting on webhook
      │
      │  (EventBridge → Lambda → backend webhook)
      ▼
READY           → HLS manifest in S3, signable
      │
      │  POST /admin/songs/:id/publish
      ▼
PUBLISHED       → publishedAt != null, visible to mobile users
```

On failure: `PROCESSING → FAILED`. Call `POST /admin/songs/:id/retry` to re-submit MediaConvert.

---

## 1. POST /admin/songs — create metadata

Creates a row in `PENDING_UPLOAD` state.

### Request

```json
{
  "title": "Anybody",
  "primaryArtistId": 7,
  "albumId": 2,
  "featuredArtistIds": [9],
  "genreIds": [3]
}
```

- `title` — required.
- `primaryArtistId` — required. FK to Artist.
- `albumId` — optional.
- `featuredArtistIds` — optional. Cannot include `primaryArtistId`.
- `genreIds` — optional.
- `isEditorial` — optional boolean. Flag to surface the song in quick-picks for new users.

### Response — 201 Created

Full `SongResponseDto` — admin-flavoured, includes `status`, `sourceS3Key`, `hlsManifestKey`, `bitrates`, `isEditorial`, `mediaConvertJobId`, `failureReason`, `publishedAt`.

### Edge cases

| Case | Status |
|---|---|
| Unknown `primaryArtistId` / `albumId` / any `genreIds` / any `featuredArtistIds` | `400 Bad Request` |
| `featuredArtistIds` contains `primaryArtistId` | `400 Bad Request` |
| Slug collision on explicit slug | `409 Conflict` |
| Missing title | `400 Bad Request` |

---

## 2. POST /admin/songs/:id/upload-url — presigned PUT

Returns a short-lived S3 upload URL.

### Request

```json
{ "contentType": "audio/mpeg" }
```

Allowed content types: `audio/mpeg`, `audio/mp4`, `audio/aac`, `audio/wav`, `audio/x-wav`, `audio/flac`, `audio/x-flac`, `audio/ogg`.

### Response — 200 OK

```json
{
  "uploadUrl": "https://al-khaliq-source.s3.us-east-1.amazonaws.com/source/42/9a7f...-original.mp3?X-Amz-Signature=…",
  "sourceKey": "source/42/9a7f...-original.mp3",
  "requiredHeaders": {
    "Content-Type": "audio/mpeg"
  },
  "expiresAt": "2026-04-18T14:37:01.333Z"
}
```

### PUT to S3 directly

```ts
await fetch(res.uploadUrl, {
  method: 'PUT',
  headers: res.requiredHeaders,
  body: file,   // raw audio file, e.g. from <input type=file>
});
```

Track progress on the fetch for a progress bar.

### Edge cases

| Case | Status |
|---|---|
| Song currently `PROCESSING` | `409 Conflict` — wait for it to finish or call `/retry` first. |
| `contentType` not in the allow-list | `400 Bad Request` |
| Unknown song id | `404 Not Found` |

---

## 3. POST /admin/songs/:id/complete-upload — kick off MediaConvert

Signal that the file is uploaded; backend submits the transcoding job.

### Request

```json
{
  "sourceKey": "source/42/9a7f...-original.mp3",
  "size": 8274921,
  "contentType": "audio/mpeg"
}
```

- `sourceKey` — must come from the previous `/upload-url` response.
- `size` — file size in bytes (for admin-UI verification, not persisted).
- `contentType` — must be one of the allowed types.

### Response — 200 OK

Updated `SongResponseDto` with `status: "PROCESSING"` and `mediaConvertJobId` set.

### Edge cases

| Case | Status |
|---|---|
| `sourceKey` doesn't start with `source/<songId>/` | `400 Bad Request` — prevents attaching a file from another song. |
| Song currently `PROCESSING` | `409 Conflict` |
| Unknown song id | `404 Not Found` |

---

## 4. Webhook flow (async)

MediaConvert emits an EventBridge event when the job finishes (typically 30s – a few minutes). The backend receives that via a Lambda relay and updates the song's status:

- **COMPLETE** → `status = READY`, `hlsManifestKey`, `duration`, `bitrates` populated, `failureReason` cleared.
- **ERROR** → `status = FAILED`, `failureReason` set.

**From the admin panel's perspective:** poll `GET /admin/songs/:id` every few seconds after `complete-upload` until `status` is `READY` or `FAILED`. Or call `GET /admin/songs` with `?status=PROCESSING` to see all in-flight jobs.

---

## 5. POST /admin/songs/:id/retry

Re-submit MediaConvert for a `FAILED` song. Uses the same source file — no re-upload needed.

### Request

Empty body.

### Response — 200 OK

`status` back to `PROCESSING`, `failureReason` cleared, new `mediaConvertJobId`.

### Edge cases

| Case | Status |
|---|---|
| Song status isn't `FAILED` | `409 Conflict` |
| No `sourceS3Key` on record (never uploaded) | `400 Bad Request` |

---

## 6. POST /admin/songs/:id/publish

Make the song visible to mobile users. Only allowed when `status === 'READY'`.

### Request

Empty body.

### Response — 200 OK

`publishedAt` set to now.

### Edge cases

| Case | Status |
|---|---|
| `status` isn't `READY` | `403 Forbidden` with message explaining the current status. |

---

## 7. POST /admin/songs/:id/unpublish

Hide from users. `publishedAt` cleared.

Response: 200 OK with updated song. Always allowed (even if status is `PROCESSING` or `FAILED`).

---

## 8. DELETE /admin/songs/:id

Delete the song + its S3 assets (raw source + HLS output).

Response: 204 No Content.

---

## Other admin song endpoints

### GET /admin/songs — paginated list

Filters: `?status=`, `?publishedOnly=true`, `?artistId=`, `?genreId=`, `?albumId=`, `?search=`, `?page=`, `?limit=`.

### GET /admin/songs/:id — detail (admin view)

Full admin DTO with all internal fields.

### PATCH /admin/songs/:id — update metadata

Fields: `title`, `slug`, `albumId` (set `null` to detach), `featuredArtistIds`, `genreIds`, `isEditorial`.

`featuredArtistIds` and `genreIds` are **replace-whole** — the array you send becomes the new set.
