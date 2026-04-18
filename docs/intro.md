---
sidebar_position: 1
slug: /
---

# Al Khaliq Backend Docs

This is the developer reference for the **Al Khaliq** music streaming platform backend — a NestJS + Prisma+ PostgreSQL service that powers the iOS and Android apps.

## What you'll find here

- **Getting started** — clone, local setup, running the tests, creating the first admin.
- **Architecture** — how the code is organised, standards we follow, the error-response contract.
- **Auth** — user auth (email / Google / Apple), admin auth, access + refresh tokens, CORS.
- **Catalog** — data model, upload pipeline, HLS playback, play counts.
- **Admin** — the admin API surface and how admin accounts are created.
- **AWS** — step-by-step setup for S3, CloudFront, MediaConvert, EventBridge and the webhook relay.

## Stack at a glance

- **Framework:** NestJS 11 (Express adapter)
- **Language:** TypeScript
- **ORM:** Prisma 7 (PostgreSQL)
- **Auth:** JWT access + DB-backed rotating refresh tokens (mobile); separate `AdminUser` table for admins.
- **Media:** S3 + CloudFront + AWS MediaConvert → HLS with 3 bitrate rungs (96 / 160 / 320 kbps AAC-LC).
- **Email:** AWS SES.
- **Docs:** OpenAPI / Swagger at `/docs` in dev. This site (Docusaurus) is for design, architecture, and runbooks.

## Conventions

- Every endpoint is validated at the HTTP boundary (`class-validator` + `class-transformer` + a global `ValidationPipe`).
- Every 4xx / 5xx response uses one shape: `{ statusCode, error, message, timestamp, path }`.
- Every controller carries full Swagger decorators — see [Architecture → Error shape](./architecture/error-shape.md) for the contract.
- Standards are codified in `.claude/backend-standards.md` in the backend repo.
