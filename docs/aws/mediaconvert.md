# MediaConvert

Transcodes raw audio into HLS with 3 bitrate rungs (96 / 160 / 320 kbps AAC-LC).

## 1. Get the regional endpoint

MediaConvert has a per-account endpoint per region. Run this once and save the URL:

```bash
aws mediaconvert describe-endpoints --region us-east-1
```

Response includes `{ "Endpoints": [{ "Url": "https://xxxx.mediaconvert.us-east-1.amazonaws.com" }] }`.

Put the URL in `.env`:

```
AWS_MEDIACONVERT_ENDPOINT=https://xxxx.mediaconvert.us-east-1.amazonaws.com
```

## 2. Create the role

Covered in [IAM → MediaConvert role](./iam.md#mediaconvert-role). Name it `MediaConvertRole`; the ARN goes in `.env`:

```
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/MediaConvertRole
```

## 3. Create the job template

The job template is checked in at **`scripts/aws/mediaconvert-template.json`** in the backend repo.

From the console:

1. MediaConvert → **Job templates → Create job template**.
2. Name: `al-khaliq-hls-3rung`.
3. Paste the contents of the template JSON into the JSON editor view.
4. Save.

Or from CLI:

```bash
aws mediaconvert create-job-template \
  --endpoint-url $AWS_MEDIACONVERT_ENDPOINT \
  --cli-input-json file://scripts/aws/mediaconvert-template.json
```

Template produces:

- Output group: **Apple HLS** (`.m3u8`).
- Three audio renditions: 96 kbps, 160 kbps, 320 kbps (all AAC-LC, 48kHz stereo).
- Segment duration: 6s (default).
- Master manifest name: `main.m3u8`.

## 4. Wire the template name into the backend

```
AWS_MEDIACONVERT_JOB_TEMPLATE_NAME=al-khaliq-hls-3rung
```

When the backend submits a job, it:

- Picks the template by name.
- Sets the input to `s3://al-khaliq-source/<sourceKey>`.
- Sets the output destination prefix to `s3://al-khaliq-media/hls/<songId>/`.

## 5. Verify a test job

Upload a small MP3 to `al-khaliq-source/test/` via the console, then from CLI:

```bash
aws mediaconvert create-job \
  --endpoint-url $AWS_MEDIACONVERT_ENDPOINT \
  --job-template al-khaliq-hls-3rung \
  --role $AWS_MEDIACONVERT_ROLE_ARN \
  --settings '{"Inputs":[{"FileInput":"s3://al-khaliq-source/test/input.mp3"}],"OutputGroups":[{"OutputGroupSettings":{"HlsGroupSettings":{"Destination":"s3://al-khaliq-media/hls/test/"}}}]}'
```

~30 seconds later, `al-khaliq-media/hls/test/` should contain a `main.m3u8` master, three `<rate>/index.m3u8` variants, and segment files.
