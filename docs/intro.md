---
sidebar_position: 1
slug: /
---

# Al Khaliq API — Frontend Integration Guide

Everything your iOS / Android / web admin-panel needs to talk to the Al Khaliq backend. Endpoints, payloads, responses, error cases, edge cases — no backend internals.

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3000/api/v1` |
| Staging | `https://TODO-staging.al-khaliq.com/api/v1` |
| Production | `https://TODO-api.al-khaliq.com/api/v1` |

All paths below are relative to the base URL — e.g. `POST /auth/login` means `POST {baseUrl}/auth/login`.

## Authentication

The API uses **Bearer tokens**. Send them as:

```http
Authorization: Bearer <accessToken>
```

There are **two separate token systems** — they share the same JWT secret but the payloads differ and the strategies are distinct:

| For | Payload shape | Issued by |
|---|---|---|
| Mobile app users | `{ sub: userId, email }` | `/auth/*` |
| Admin panel | `{ sub: adminId, role, kind: 'admin' }` | `/admin/auth/*` |

A user token cannot call admin endpoints; an admin token cannot call user endpoints. Each surface issues its own pair.

## Response envelope

- **Success responses** — the resource directly. No `{ success: true, data: … }` wrapper.
- **List responses** — when paginated: `{ items, total, page, limit, totalPages }`. When fixed-size (home feed sections): a flat array.
- **Error responses** — always the same shape (see [Errors](./errors.md)).

## Rate limiting

A global throttler limits requests per IP:

- Default: **60 requests / 60 seconds**.
- Some endpoints tighten this further (signup 5/min, login 10/min, password-reset requests 3/min).

When exceeded you get a `429 Too Many Requests` in the standard error shape.

## What this site covers

- [Getting started](./getting-started.md) — how to call your first endpoint end-to-end
- [Errors](./errors.md) — the error contract and how to handle each status
- [Auth](/category/auth) — signup, login, Google/Apple, refresh, password reset
- [Catalog](/category/catalog) — song/artist/album/genre detail endpoints
- [Discovery](/category/discovery) — home feeds, explore, search
- [Playback](/category/playback) — HLS streaming, play events, recently played, cross-device now-playing sync
- [Library](/category/library) — playlists, liked songs, saved playlists, sharing, recommendations
- [Admin API](/category/admin-api) — everything under `/admin/*` for the web admin panel

## What this site does **not** cover

Backend internals (architecture, module layout, AWS setup, migrations, standards) live in the backend repo's README + `notes.md` + `.claude/backend-standards.md`. This site is for frontend integration only.
