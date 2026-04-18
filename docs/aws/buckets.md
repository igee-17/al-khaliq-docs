# S3 buckets

Two buckets, one region, both private.

## `al-khaliq-source`

Where raw audio uploads land.

- **Region:** match your SES region.
- **Block all public access:** on.
- **Default encryption:** SSE-S3.
- **Versioning:** off.
- **Lifecycle rule:** delete objects 30 days after creation (source is disposable once MediaConvert has consumed it).

## `al-khaliq-media`

Where MediaConvert writes HLS output.

- **Region:** same as source bucket.
- **Block all public access:** on.
- **Default encryption:** SSE-S3.
- **Versioning:** off.
- **No lifecycle rule** — media is permanent until an admin deletes the song (which triggers a cleanup).

### Bucket policy (applied after CloudFront OAC is created)

Replace `ACCOUNT_ID` and `DISTRIBUTION_ID`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::al-khaliq-media/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

## Object layout

```
al-khaliq-source/
  source/
    42/
      9a7f...-original.mp3        raw upload for song 42

al-khaliq-media/
  hls/
    42/
      main.m3u8                    master playlist
      96kbps/
        index.m3u8
        segment-00001.ts
        ...
      160kbps/
        index.m3u8
        segment-00001.ts
        ...
      320kbps/
        index.m3u8
        segment-00001.ts
        ...
```

The backend reconstructs these keys from `song.id` — no separate lookup needed.
