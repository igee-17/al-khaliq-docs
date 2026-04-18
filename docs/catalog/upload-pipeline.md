# Upload pipeline

How a raw audio file uploaded by an admin becomes a streamable HLS manifest.

## The actors

- **Backend** (NestJS) — orchestrates, never touches the audio bytes.
- **Admin client** (web) — uploads directly to S3 using a presigned URL.
- **S3 `al-khaliq-source`** — receives raw uploads. Lifecycle rule deletes >30 days.
- **AWS MediaConvert** — transcodes to HLS, 3 rungs (96 / 160 / 320 kbps AAC-LC).
- **S3 `al-khaliq-media`** — MediaConvert output. Fronted by CloudFront via OAC.
- **EventBridge rule** — listens for `MediaConvert Job State Change`.
- **Lambda `al-khaliq-mediaconvert-webhook-relay`** — relays the event to the backend.

## End-to-end flow

```
Admin                      Backend                         S3 source     MediaConvert     S3 media     Lambda
  │  POST /admin/songs        │                              │                │                │          │
  │  (metadata)                │                              │                │                │          │
  │  ◄──── {songId} ──────────│                              │                │                │          │
  │                            │                              │                │                │          │
  │  POST /songs/:id/upload-url│                              │                │                │          │
  │  ◄────── {uploadUrl} ─────│                              │                │                │          │
  │                            │                              │                │                │          │
  │  PUT raw audio ──────────────────────────────────────►   │                │                │          │
  │                            │                              │                │                │          │
  │  POST /songs/:id/complete-upload                          │                │                │          │
  │                            │   CreateJob ────────────────►│                │                │          │
  │                            │                              │                │                │          │
  │                            │                              │  read source ─►│                │          │
  │                            │                              │                │  transcode     │          │
  │                            │                              │                │  ──► write ───►│          │
  │                            │                              │                │                │          │
  │                            │                              │  EventBridge: Job State COMPLETE          │
  │                            │                              │                │   ────────────────────────►│
  │                            │                              │                │                │          │
  │                            │   POST /internal/media-convert-webhook ◄────────────────────────────────│
  │                            │   (X-Webhook-Secret header)                                               │
  │                            │                                                                           │
  │                            │   status = READY, hlsManifestKey, duration                                │
  │                            │                                                                           │
  │  POST /songs/:id/publish   │                                                                           │
```

## Key design points

- **The backend never handles the audio bytes.** Uploads go direct to S3; only metadata flows through the backend.
- **The webhook is authenticated with a shared secret header** (`X-Webhook-Secret: <MEDIACONVERT_WEBHOOK_SECRET>`), checked by `WebhookSecretGuard`. Lambda holds the same secret in env.
- **Status transitions are driven by the webhook**, not by any polling. If the webhook fails, the song stays in `PROCESSING` indefinitely — Lambda's dead-letter queue lets you investigate.
- **`POST /retry`** re-submits the same source key when a job failed — no re-upload needed.

## AWS setup

Full runbook is in [AWS → MediaConvert](../aws/mediaconvert.md) and [AWS → Webhook](../aws/webhook.md).
