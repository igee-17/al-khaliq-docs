# Running tests

The backend uses **integration tests against a real Postgres database** — not unit tests with mocked Prisma. See `.claude/backend-standards.md` §3 for why.

## Prerequisite

Your `DATABASE_URL` env must point to a test-safe database. Tests wipe tables between cases.

## Commands

Full suite:

```bash
NODE_OPTIONS='--max-old-space-size=8192' npx jest --no-coverage
```

Single module:

```bash
NODE_OPTIONS='--max-old-space-size=8192' npx jest --no-coverage --testPathPattern="auth.integration"
```

Watch mode while developing:

```bash
yarn test:watch
```

## What's mocked

Only external I/O that would be non-deterministic or costly:

- `EmailService` (AWS SES)
- `GoogleVerifierService` (Google JWKS)
- `AppleVerifierService` (Apple JWKS)
- `MediaConvertService` and `PresignedUrlService` (AWS SDK calls)
- `CloudFrontSignerService` (cert-bound signing)

The DB, bcrypt, JWT signing/verifying, and the whole NestJS request pipeline run for real.

## Throttling in tests

`ThrottlerModule` skips when `NODE_ENV=test` via its `skipIf` option. No per-route `@Throttle()` override needed.
