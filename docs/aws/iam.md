# IAM

## Backend IAM user

**Name:** `al-khaliq-backend-media`
**Type:** Programmatic access only (no console)

### Inline policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SourceBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::al-khaliq-source",
        "arn:aws:s3:::al-khaliq-source/*"
      ]
    },
    {
      "Sid": "MediaBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::al-khaliq-media",
        "arn:aws:s3:::al-khaliq-media/*"
      ]
    },
    {
      "Sid": "MediaConvert",
      "Effect": "Allow",
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:ListJobs",
        "mediaconvert:DescribeEndpoints"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassMediaConvertRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/MediaConvertRole"
    },
    {
      "Sid": "CloudFrontRead",
      "Effect": "Allow",
      "Action": ["cloudfront:ListDistributions"],
      "Resource": "*"
    }
  ]
}
```

Replace `ACCOUNT_ID` with your 12-digit AWS account ID.

### Downloading keys

1. IAM → the user → **Security credentials** → **Create access key** → select "Application running outside AWS".
2. Copy both values immediately — the secret is shown once.
3. Put them in `.env`:

```
AWS_ACCESS_KEY_ID=AKIA…
AWS_SECRET_ACCESS_KEY=…
```

### Rotation

Rotate every 90 days. The procedure:

1. Create a second access key for the user.
2. Update `.env` in prod with the new pair; restart the service.
3. Confirm the backend is healthy with the new credentials.
4. Delete the old access key in IAM.

## MediaConvert role

**Name:** `MediaConvertRole`

Trust relationship:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "mediaconvert.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Inline permission policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::al-khaliq-source",
        "arn:aws:s3:::al-khaliq-source/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::al-khaliq-media/*"]
    }
  ]
}
```

The backend's IAM user has `iam:PassRole` on this role so it can submit MediaConvert jobs that assume it.
