# Request flow

Order of execution for any incoming HTTP request:

```
Client
  │
  ▼
Helmet (security headers)
  │
  ▼
CORS middleware
  │
  ▼
Body / query parser
  │
  ▼
Global guards (APP_GUARD, in registration order)
  ├── ThrottlerGuard   ──► 429 if rate limit exceeded
  └── JwtAuthGuard     ──► 401 if missing/invalid access token
                           └── skips if @Public() OR @AdminRoute()
  │
  ▼
Route-level guards
  ├── AdminJwtAuthGuard  (on @AdminRoute routes)
  └── AdminRolesGuard    (on @AdminRoute with roles)
  │
  ▼
Global ValidationPipe (transforms + validates the DTO)
  │  ──► 400 with message: string[] on failure
  ▼
Controller handler
  │
  ▼
Service(s) / Prisma
  │
  ▼
Response serialiser
  │
  ▼
On thrown error:
  HttpExceptionFilter (HttpException subclasses)  ──► standardised shape
  PrismaExceptionFilter (Prisma errors)           ──► 409 / 404 / 400 / 500 with standardised shape
```

## Key rules

- Guards run **before** the `ValidationPipe`. A 401 on a public route means the guard decided without seeing the body.
- Filters run at the very end. Any error thrown anywhere in the stack ends up in one of them, and responses always use the `{ statusCode, error, message, timestamp, path }` shape — see [Error shape](./error-shape.md).
- Global pipes transform. For example, `@Type(() => Number)` on a DTO field converts the string `"42"` to `42` before the controller sees it.
- `transform: true` on the global `ValidationPipe` also class-instantiates the DTO. `whitelist: true` strips undeclared fields. `forbidNonWhitelisted: true` rejects requests that include them.
