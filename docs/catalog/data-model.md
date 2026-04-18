# Data model

The catalog is own-content only (no third-party proxying, no licensed material). See `prisma/schema.prisma` in the backend repo for the authoritative schema.

## Entities

| Model | Purpose |
|---|---|
| `Artist` | One artist / act. Has a unique `slug`, optional `imageKey`, optional `bio`. |
| `Album` | Collection of songs. `primaryArtistId` FK; optional `releaseDate` + `coverImageKey`. |
| `Genre` | Pop, R&B, Rap, etc. Unique `name` and `slug`. |
| `Song` | One track. Includes `status`, `sourceS3Key`, `hlsManifestKey`, `duration`, `bitrates[]`, `playCount`, `publishedAt`. |
| `SongArtist` | M2M between Song and Artist with a `role` (`PRIMARY` \| `FEATURED`). |
| `SongGenre` | M2M between Song and Genre. |
| `PlayEvent` | Per-day de-duplicated play count for `(userId, songId, dayBucket)`. |

## Song lifecycle

```
PENDING_UPLOAD   - row created; no source file yet
      │
      │  admin uploads source; backend submits MediaConvert job
      ▼
PROCESSING       - waiting for MediaConvert job to complete
      │
      │  webhook from Lambda fires with COMPLETE or ERROR
      ▼
READY            - HLS manifest in S3; can be signed and streamed
      │
      │  admin hits POST /admin/songs/:id/publish
      ▼
PUBLISHED        - (publishedAt IS NOT NULL) visible to end users
```

On ERROR: `status = FAILED`, `failureReason` set. Admin can `POST /admin/songs/:id/retry` to re-submit with the same source.

## Relations and cascades

- `Song.primaryArtist` → `onDelete: Restrict`. Can't delete an artist with songs.
- `Song.album` → `onDelete: SetNull`. Deleting an album un-links its songs.
- `SongArtist`, `SongGenre`, `PlayEvent` → `onDelete: Cascade` on `Song`. Deleting a song cleans the M2M rows and play events.

## Soft-delete

Nothing is soft-deleted at the DB level. "Unpublish" via `publishedAt = null` is the right tool for hiding.
