# EventBridge → Lambda → backend webhook

When a MediaConvert job finishes, the backend needs to hear about it. EventBridge watches MediaConvert state changes and invokes a tiny Lambda that relays the event to the backend over HTTPS with a shared secret header.

## The flow

```
MediaConvert
    │  (job COMPLETE or ERROR)
    ▼
EventBridge rule (filters by source + detail-type + status)
    │
    ▼
Lambda al-khaliq-mediaconvert-webhook-relay
    │  HTTPS POST with X-Webhook-Secret
    ▼
Backend  POST /api/v1/internal/media-convert-webhook
    │  WebhookSecretGuard verifies the secret
    ▼
Song.status ← READY or FAILED
```

## 1. Create the Lambda

Source is checked into the backend repo at `scripts/aws/lambda-webhook-relay/`.

1. Lambda → **Create function**.
2. Name: `al-khaliq-mediaconvert-webhook-relay`.
3. Runtime: Node.js 20.
4. Upload the zipped source from the backend repo.
5. **Configuration → Environment variables:**
   - `BACKEND_WEBHOOK_URL` — the public URL of the backend, e.g. `https://api.al-khaliq.com/api/v1/internal/media-convert-webhook`
   - `WEBHOOK_SECRET` — 32 random bytes, same value as `MEDIACONVERT_WEBHOOK_SECRET` in the backend `.env`
6. **Configuration → General → Timeout:** 30s.
7. **Dead-letter queue:** create an SQS queue `al-khaliq-webhook-dlq` and point the Lambda's DLQ at it.

## 2. Create the EventBridge rule

1. EventBridge → **Rules → Create rule**.
2. Name: `al-khaliq-mediaconvert-complete`.
3. Event bus: default.
4. Rule type: Event pattern.
5. Pattern:

```json
{
  "source": ["aws.mediaconvert"],
  "detail-type": ["MediaConvert Job State Change"],
  "detail": {
    "status": ["COMPLETE", "ERROR"]
  }
}
```

6. Target: Lambda function → `al-khaliq-mediaconvert-webhook-relay`.
7. Save.

## 3. Shared secret

Both sides hold the same string:

- Lambda env `WEBHOOK_SECRET`.
- Backend env `MEDIACONVERT_WEBHOOK_SECRET`.

Rotate by updating both in the same deployment window.

Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 4. Verify

Run the test job from [MediaConvert → step 5](./mediaconvert.md#5-verify-a-test-job). Watch:

- CloudWatch Logs for the Lambda → should show the event + the `POST` attempt.
- Backend logs → should show `[POST /api/v1/internal/media-convert-webhook] 204`.

If the backend isn't running (local dev), the Lambda's retries will eventually DLQ. That's fine — the Lambda re-fires on every state change, so start the backend and re-run the test.

## Local dev alternative

For local work without deploying Lambda, simulate the webhook with curl:

```bash
curl -X POST http://localhost:3000/api/v1/internal/media-convert-webhook \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Secret: <MEDIACONVERT_WEBHOOK_SECRET from .env>' \
  -d '{"jobId":"<mediaConvertJobId>","status":"COMPLETE","outputPath":"hls/42/main.m3u8","duration":247,"bitrates":[96,160,320]}'
```
