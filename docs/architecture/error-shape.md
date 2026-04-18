# Error response shape

**Every 4xx / 5xx response across the whole API uses exactly one shape.** The mobile clients are built against this contract.

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "email must be an email",
  "timestamp": "2026-04-18T14:22:01.333Z",
  "path": "/api/v1/auth/signup"
}
```

- `message` is a **string** for almost every error.
- `message` is a **string array** only when `ValidationPipe` produced per-field validation errors (one item per failing field).
- `timestamp` is ISO 8601 UTC.
- `path` is the request URL.
- No stack traces, no Prisma internals, no SQL.

## How it's enforced

Three components, all in `src/common/filters/`:

| Component | Catches | Produces |
|---|---|---|
| `ValidationPipe` (global) | DTO validation failures | 400 with `message: string[]` |
| `HttpExceptionFilter` | every `HttpException` subclass | normalised `{ statusCode, error, message, timestamp, path }` |
| `PrismaExceptionFilter` | `Prisma.PrismaClientKnownRequestError` + `PrismaClientValidationError` | 409 (P2002), 404 (P2025), 400 (P2003), 500 (validation); same shape |

## Rules for contributors

- **No raw `throw new Error(...)`** in services — always a NestJS `HttpException` subclass.
- **No custom error body via `res.json(...)`** in controllers — let the filter format.
- **Never alter the shape.** Changing it is a breaking API change; mobile clients break silently.

See `.claude/backend-standards.md` §14 for the full contract and rationale.
