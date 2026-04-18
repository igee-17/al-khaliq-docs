# CloudFront

CloudFront fronts `al-khaliq-media` and serves HLS to the mobile apps. Every URL is signed by the backend with a private RSA key.

## 1. Generate a key pair

On your laptop:

```bash
openssl genrsa -out al_khaliq_cloudfront_private.pem 2048
openssl rsa -pubout -in al_khaliq_cloudfront_private.pem -out al_khaliq_cloudfront_public.pem
```

Keep the **private** key safe. It goes in the backend's env only (see below).

## 2. Upload the public key

1. CloudFront console → **Key management → Public keys → Create public key**.
2. Paste the contents of `al_khaliq_cloudfront_public.pem`.
3. Name: `al_khaliq_primary`.
4. Copy the **Public key ID** (e.g., `K1234567890ABCDE`) — this goes in `AWS_CLOUDFRONT_KEY_PAIR_ID`.

## 3. Create a key group

1. **Key management → Key groups → Create key group**.
2. Name: `al_khaliq_key_group`.
3. Select the public key from step 2.

## 4. Create the distribution

1. **Distributions → Create distribution**.
2. **Origin:**
   - Origin domain: `al-khaliq-media.s3.<region>.amazonaws.com`
   - Origin access: **Origin access control settings (recommended)** → Create a new OAC named `al_khaliq_media_oac`.
   - Save — CloudFront will give you a bucket policy snippet to paste on `al-khaliq-media`. Do that now (see [Buckets](./buckets.md#bucket-policy-applied-after-cloudfront-oac-is-created)).
3. **Default cache behaviour:**
   - Viewer protocol policy: **Redirect HTTP to HTTPS**.
   - Allowed methods: GET, HEAD.
   - **Restrict viewer access (use signed URLs or signed cookies):** **Yes, trusted key groups**.
   - Trusted key groups: add `al_khaliq_key_group`.
4. **Settings:**
   - Price class: whatever matches your geography (Class 100 for North America + Europe is usually enough).
   - Alternate domain name: leave blank for now (you can attach `media.al-khaliq.com` later with an ACM cert).
5. Create. Wait ~5 minutes for deployment. Copy the **Distribution domain name** (e.g., `d1234567890abc.cloudfront.net`) — this goes in `AWS_CLOUDFRONT_DISTRIBUTION_DOMAIN`.

## 5. Configure the backend

Add to `.env`:

```
AWS_CLOUDFRONT_DISTRIBUTION_DOMAIN=d1234567890abc.cloudfront.net
AWS_CLOUDFRONT_KEY_PAIR_ID=K1234567890ABCDE
AWS_CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
```

Newlines in the private key must be escaped as `\n` to survive `.env` parsing. The backend's config loader re-expands them.

## 6. Verify

With a real song in `READY` state, hit `GET /api/v1/songs/:id/stream` as an authenticated user. Paste the returned URL into VLC (`File → Open Network` on macOS) or `curl -I`. You should get a signed-URL response that the media player resolves into HLS segments.

## Common mistakes

- **`AWS_CLOUDFRONT_KEY_PAIR_ID` mismatch** → every signed URL returns 403. CloudFront only trusts keys in the key group attached to the behaviour.
- **Pasting the private key with raw newlines** in `.env` → the config validator rejects it. Use `\n` escapes.
- **Forgetting the bucket policy for OAC** → CloudFront returns 403 with "Access Denied" as the body.
