# CORS

Configured in `src/main.ts`:

```ts
app.enableCors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
});
```

`corsOrigins` comes from `CORS_ORIGINS` env, comma-separated.

## Rules of thumb

- **Mobile clients don't need CORS** — they're not browsers. But web admin panels and dev tools (like Swagger UI served elsewhere) do.
- Leave `CORS_ORIGINS` blank in dev to allow all origins.
- In production, set an explicit list: `CORS_ORIGINS=https://admin.al-khaliq.com,https://al-khaliq.com`.
- Credentials are enabled — keep cookie-based auth disabled unless you specifically want cross-origin cookies.
