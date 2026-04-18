# Standards

Every backend change follows the rules in **`.claude/backend-standards.md`** in the backend repo. That file is the source of truth — this page is a map to its sections.

## The sections you'll need most often

| § | Topic | Why you care |
|---|---|---|
| 0 | The core mental model | The HTTP boundary is the only trust boundary |
| 1 | Type coercion from `any` / `Json` / `JSON.parse()` | DTOs types are not runtime guarantees — coerce every field |
| 2 | DTO validation with `class-validator` | Required decorator combos per field type |
| 3 | Integration tests (not unit) | Hit real Postgres; mock only external I/O |
| 4 | Global exception filters (Prisma + HttpException) | Produce the standardised error shape |
| 4a | Process-level safety + WS filter + @nestjs/\* major alignment | Keep the process alive, pin framework majors |
| 5 | `undefined` into Prisma writes | Use conditional spread `...(val != null ? { field: val } : {})` |
| 6 | Tenant isolation on user-owned models | `userId` in every `where`; throw on null lookup |
| 7 | Query standards (pagination, indexes, no writes in loops) | Every list paginated; no `prisma.*` inside `for` |
| 8 | Response shapes | Never expose raw Prisma model fields |
| 9 | Security checklist | ParseIntPipe on route params, global throttler, input sanitisation |
| 10 | Running tests | Run relevant tests after every change before marking done |
| 11 | Pre-ship endpoint checklist | Tick through before opening a PR |
| 12 | Common mistakes reference table | Classes of bug the rules exist to prevent |
| 13 | Swagger decorators mandatory on every endpoint | Every handler: `@ApiTags`, `@ApiOperation`, a `@Api*Response` per status; every DTO field `@ApiProperty` |
| 14 | Error response shape contract | `{ statusCode, error, message, timestamp, path }` everywhere |

## Pointer

Open `.claude/backend-standards.md` in the backend repo — it's maintained there alongside the code.
