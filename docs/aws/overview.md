# AWS overview

What lives where in AWS:

```
                                    ┌──────────────────────────────┐
                                    │         Admin (web)          │
                                    └──┬────────────────────────┬──┘
                                       │ 1. POST /admin/songs   │
                                       │    → {songId, ...}     │ 3. PUT raw audio (direct)
                                       ▼                        ▼
            ┌─────────────────────────────────────┐       ┌──────────────────┐
            │   Al Khaliq backend (NestJS)       │       │  S3 al-khaliq-source │
            │                                     │       │  (30-day lifecycle) │
            │  • admin auth + CRUD                │       └──────────────────┘
            │  • presign PUT URLs                 │                │
            │  • submit MediaConvert jobs         │ 4. CreateJob   │
            │  • receive internal webhook         │ ──────────────►│
            │  • sign CloudFront URLs             │                ▼
            └─────────────────────────────────────┘       ┌──────────────────┐
                    ▲          ▲                          │   MediaConvert   │
                    │          │ 6. POST /internal/        │   (HLS 3-rung)   │
                    │          │    media-convert-webhook │                  │
                    │          │                          └─────────┬────────┘
                    │          │                                    │ 5. Write
                    │     ┌────┴──────────────┐                     │    HLS
                    │     │ Lambda: webhook    │◄── EventBridge ────┘    output
                    │     │ relay              │    (Job State Change)    │
                    │     └───────────────────┘                           ▼
                    │                                       ┌──────────────────────┐
                    │ 7. GET /songs/:id/stream              │  S3 al-khaliq-media  │
                    │    → signed CloudFront URL            │   (HLS .m3u8 + .ts)  │
                    │                                       └──────────┬───────────┘
                    │                                                  │ OAC
                    │ 8. GET signed URL                                ▼
                    └───────────────────────────────────────► CloudFront distribution
                                                            (signed URL required)
                                                                       │
                                                                       ▼
                                                                Mobile app (AVPlayer / ExoPlayer)
```

## Regions

Keep everything in one region. Whatever you picked for SES is the one — typically `us-east-1`, `us-west-2`, or `eu-west-1`. Mixing regions means extra egress costs and two IAM story lines.

## IAM principal

The backend talks to AWS as one IAM user (`al-khaliq-backend-media`). Access key ID + secret live in `.env`. Keys rotate on a schedule — see [IAM](./iam.md).

## Cost shape

For a low-volume music app:

- S3 — pennies/month for storage, pennies per 1000 requests.
- MediaConvert — per-minute transcoded. ~$0.01 per 3-min song for the 3-rung HLS template.
- CloudFront — per GB delivered; roughly $0.085/GB for first 10 TB in most regions.
- Lambda + EventBridge — effectively free at this volume.

Billing alarm at ~$50/month is a cheap safety net; set it up before opening the firehose.
