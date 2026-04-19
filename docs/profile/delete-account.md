---
sidebar_position: 5
---

# Delete account

Soft delete + scheduled hard purge. Designed to:
- Satisfy GDPR-style "right to be forgotten" without destroying aggregate signal the day they click the button.
- Let support reverse accidental deletions inside the retention window.
- Preserve the **song-level `playCount`** so global popularity rankings don't regress every time a user churns.

## DELETE /me/profile

**Requires:** Bearer.

**Rate-limited:** 3 requests / 60 seconds per IP.

### Response — 204 No Content

### What happens at delete-time (soft-delete)

- `deletedAt` is set on the user row.
- Email is replaced with a tombstone: `deleted-{id}@tombstone.local` (keeps the unique constraint satisfied, frees the original email for re-signup).
- `name`, `avatarKey`, `avatarUrl`, `googleId`, `appleId`, `passwordHash`, `isEmailVerified` are cleared.
- **Every refresh token is revoked.**
- **`PlaybackState` row is deleted** (no point syncing state to a deleted user).
- Old avatar object is deleted from S3 best-effort.
- An `AccountAuditLog` row with action `PROFILE_DELETED` is written.

### What is RETAINED after soft-delete

Rows the user produced that feed platform-wide signals stay in place until the hard-purge:

- `PlayEvent` (keeps `Song.playCount` aggregates intact for other users' home/explore recs)
- `RecentlyPlayed`
- `Playlist` they owned (visibility rules still apply — private ones become effectively dead since no one can log in as them)
- `Pin`, `Download`, `NotInterested`, `LikedSong`, `SavedPlaylist`, `AccountAuditLog`

After soft-delete, the user's JWT strategy starts returning 401 on any endpoint — the tombstoned row is filtered out of every `findBy*` lookup.

### Re-signup

The original email is free for re-signup immediately (the tombstone email doesn't collide). The new account has a **new `id`** and zero history — PlayEvents and playlists from the deleted account are not inherited.

### curl

```bash
curl -X DELETE http://localhost:3000/api/v1/me/profile \
  -H 'Authorization: Bearer <accessToken>'
```

---

## Hard-purge retention cron

A daily cron (default 03:00 UTC) finds users with `deletedAt < now() - USER_RETENTION_DAYS` (default **90 days**, configurable via env, minimum 30) and **hard-deletes** them. Cascades:

- `PlayEvent` rows → **deleted** (but `Song.playCount` is a denormalized counter that was incremented at play-time, so aggregates don't regress).
- `RecentlyPlayed` → deleted.
- `Playlist` they owned → deleted. Other users' `SavedPlaylist` rows pointing at those playlists → deleted via cascade. (A user's saved-library shelf will silently shrink — this is the only user-visible side-effect.)
- `Pin`, `Download`, `NotInterested`, `LikedSong`, `SavedPlaylist` → deleted.
- `RefreshToken`, `EmailVerification`, `PasswordReset`, `EmailChangeRequest`, `AccountAuditLog` → deleted.
- Any residual avatar S3 object → deleted.

The cron is capped at **100 users per run** so one sweep doesn't hold long locks. Large backlogs clear over successive days.

### Tuning

Set `USER_RETENTION_DAYS` in your env:

```
USER_RETENTION_DAYS=90   # default; min 30
```

Shorter = faster GDPR compliance, less recovery window. Longer = more safety for accidental deletes but larger tombstoned footprint.
