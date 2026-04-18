# Local setup

Steps to run the backend on your machine.

## Prerequisites

- Node.js 20+
- Yarn (classic)
- PostgreSQL 15+ running locally (or a remote DB you control)

## Clone and install

```bash
git clone <repo-url>
cd al_khaliq_backend
yarn install
```

## Environment variables

Copy the template and fill in real values:

```bash
cp .env.example .env
```

The template documents every variable. Minimum to boot: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`, `GOOGLE_CLIENT_IDS`, `APPLE_BUNDLE_IDS`.

Generate the JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Database

Create a dev database:

```bash
createdb al_khaliq_dev
```

Apply migrations:

```bash
npx prisma migrate deploy
```

## Run

```bash
yarn start:dev
```

Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs).
