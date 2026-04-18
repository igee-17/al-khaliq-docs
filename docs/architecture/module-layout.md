# Module layout

```
src/
  main.ts                       app bootstrap (CORS, helmet, pipes, filters, Swagger)
  app.module.ts                 root module wiring

  config/                       env validation + typed AppConfig
  database/                     PrismaService + DatabaseModule (@Global)
  common/                       filters, decorators, shared DTOs
    filters/                    HttpExceptionFilter, PrismaExceptionFilter
    decorators/                 @Public, @CurrentUser, @AdminRoute, @CurrentAdmin
    dto/                        ErrorResponseDto

  auth/                         user-facing auth (email / Google / Apple)
    guards/                     JwtAuthGuard (global)
    strategies/                 JwtStrategy
    services/                   TokenService, PasswordService, GoogleVerifierService,
                                AppleVerifierService, VerificationService
    dto/                        every request + response DTO

  admin-auth/                   admin-only auth surface (separate table, separate strategy)
    guards/                     AdminJwtAuthGuard, AdminRolesGuard
    strategies/                 AdminJwtStrategy (passport name 'jwt-admin')
    services/                   AdminTokenService

  admins/                       SUPER_ADMIN-managed admin CRUD

  users/                        user model service

  email/                        AWS SES sender + templates

  catalog/                      catalog domain
    artists/, albums/, genres/, songs/   each has module + controller + service + DTOs + tests

  media/                        AWS media pipeline
    services/                   PresignedUrlService, MediaConvertService,
                                CloudFrontSignerService, MediaCleanupService
    controllers/                InternalWebhookController
    guards/                     WebhookSecretGuard

  playback/                     /songs/:id/stream + /playback/events
```

## Module conventions

- A module owns one domain concept. One controller per module by default.
- Services that call AWS live in `src/media/`. Domain modules never import `@aws-sdk/*` directly.
- Global providers: `PrismaService` (`@Global()` via `DatabaseModule`), `ConfigService` (`@nestjs/config` global).
- Global guards via `APP_GUARD`: `JwtAuthGuard` (user), `ThrottlerGuard`. Admin routes skip the JWT one with `@AdminRoute()`.
- Global filters: `HttpExceptionFilter`, `PrismaExceptionFilter`. Order matters — `HttpException` wins over Prisma errors when both apply.
