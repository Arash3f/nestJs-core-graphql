# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

NestJS 11 + Apollo Server 5 (`@nestjs/graphql` 13, code-first, schema auto-generated to `schema.gql`) + Fastify 5 + Prisma 7 (PostgreSQL via `@prisma/adapter-pg` driver adapter) + TypeScript 6. Package manager is **pnpm**.

Prisma 7 note: the DB connection URL is NOT in `schema.prisma`. It's read from `DATABASE_CONNECTION_URL` in `prisma.config.ts` (for CLI commands) and passed to `PrismaPg` adapter in `src/modules/prisma/prisma.service.ts` (for the running app).

## Common commands

```bash
pnpm install
cp .env.sample .env.dev          # fill in values, then:
pnpm exec prisma generate

pnpm run start:dev               # dev (webpack HMR, uses .env.dev)
pnpm run start:build && pnpm run start:prod   # production build/run (.env.prod)

pnpm run lint                    # eslint --fix
pnpm run typecheck               # tsc --noEmit

pnpm run api                     # regenerate Zeus GraphQL client from schema.gql (after schema changes)
pnpm run test                    # jest tests (.env.test) — both unit and e2e
pnpm run test:cov                # tests with coverage

pnpm run prisma:migrate:dev      # prisma migrate dev (.env.dev)
pnpm run prisma:push:dev         # prisma db push (.env.dev)
```

There is no `test:migrate`/`test:e2e`/`doc` script — those names are not defined in `package.json`. Push the schema to the test DB directly with `env-cmd -f ./.env.test prisma db push`.

Tests live under `tests/` (not `src/`): `tests/e2e/*.e2e.spec.ts` (full-app, through the Zeus client) and `tests/unit/**/*.spec.ts` (guards, filters, pipes, utils, prisma helpers). Jest's `testRegex` is `.spec.ts$`, so `pnpm run test` runs both; target a subset by path, e.g. `env-cmd -f ./.env.test jest --config jest.config.js tests/unit`, or a case with `-t "name of test"`.

Before running e2e tests: the test DB schema must be pushed, and the Zeus client (`src/utils/graphql/zeus`) must be in sync with `schema.gql` (`pnpm run api`) — tests call the API through the generated Zeus client, not raw fetch.

## Architecture

### Module shape
Each feature lives under `src/modules/<name>/` with `*.module.ts`, `*.resolver.ts` (GraphQL-facing), `*.service.ts` (business logic), `dto/` (GraphQL input/output classes), `model/` (GraphQL object types), `constants/errors.ts` (module's typed error catalog). Feature modules are `auth` (login/register/tokens) and `user` (user CRUD, roles); `config`, `prisma`, `init` are infra modules wired in `app.module.ts`.

### Request pipeline
1. `TokenGuard` (`src/common/guards/token.guard.ts`) is registered **globally** in `main.ts` (`app.useGlobalGuards`) for every GraphQL request. It never throws — it decodes the bearer JWT (if present), and when the token verifies **and** its `deviceId` claim matches the request's device fingerprint (`sha256(User-Agent)`, see `src/common/utils/device-fingerprint.util.ts`), it attaches `req.user = { id, username }`. A missing/invalid/device-mismatched token simply leaves `req.user` unset, so unauthenticated queries (e.g. `logIn`) still work.
2. Per-resolver guards in `src/common/guards/` read `req.user` and decide access, throwing `AppException` on failure:
   - `IsLoggedInGuard` — requires `req.user`, then loads the user and rejects if it no longer exists (`UserIsNotAuthorized`) or has been deactivated (`InactiveUser`).
   - `IsAdminGuard` — additionally requires `role === Admin`, rejecting with `InactiveUser` or `AccessDenied`.
   Both hit the DB so a deactivated account is locked out immediately, even while holding a not-yet-expired access token.
3. Resolvers extract request data via param decorators in `src/common/decorators/` (`@GetUserId()`, `@GetJwtToken()`, `@GetIp()`, `@GetDeviceFingerprint()`), not by reaching into the raw context manually. `@GetUserId()` throws `UserIsNotAuthorized` when no user is attached, so it doubles as a "must be logged in" assertion.

### Auth specifics
- Passwords are hashed with **argon2id** (cost params from `PASSWORD_HASH_*` env). Refresh tokens are likewise hashed (argon2) and stored on the user row; logout nulls the stored hash.
- Issued JWTs are **device-bound**: the `deviceId` claim must match the calling device's fingerprint on both `TokenGuard` decode and `refreshToken`.
- `register` always forces `role: Member` server-side — a visitor cannot self-register as Admin. Creating a user with an explicit role is the admin-only `createUser` mutation.
- `changePassword` is **admin-only** and resets any user's password by id (no current-password check). `changeMyPassword` is the **self-service** path: it verifies the requester's `currentPassword` before applying the new one.

### Args / DTO convention
Resolvers use plain `@Args("data" | "where" | "pagination" | "sortBy")` bound to DTO classes (`@InputType()` with `class-validator` decorators). Shared DTOs live in `src/common/dto/` — notably `IdInput`, `SuccessOutput`, `PaginationData` (`take`/`skip`, capped at 200), and `SortByData` (`field`/`descending`). `SortByData.convertToPrismaFilter(model)` validates the requested field against the model's real columns via Prisma DMMF, raising a `400` (`PrismaErrors.InvalidSortField`) instead of letting Prisma throw a `500`.

### Error handling
Errors are NOT thrown as plain `Error`/`HttpException`. Each module defines a typed catalog in `constants/errors.ts` (e.g. `AuthErrors`, `UserErrors`, `PrismaErrors`) of `{ code, module, message, persianTranslation, statusCode }` entries. Code throws by reference: `throw new AppException(AuthErrors.UserNotFound)` (`src/app.exception.ts`). The global `CoreExceptionFilter` (`src/common/filters/core-exception.filter.ts`, registered in `main.ts`) normalizes any thrown value into an `ErrorResponseBody` and rethrows it as a `GraphQLError` carrying that body under `extensions.originalError`; Apollo's `formatError` (in `app.module.ts`) promotes it to the top-level `extensions`. In production (`NODE_ENV=production`) the filter strips `debugError`/`developerMessage`; in development it logs full detail. To add an error, add an entry to the relevant module's catalog object — no central registration step is needed.

Prisma errors are funneled through `PrismaService.handlePrismaErrors({ error, notFoundError, duplicatedErrors, foreignKeyErrors })`, which maps P2025/P2002/P2003 to domain `AppException`s (extracting the offending field from either the driver-adapter cause or legacy `meta`) and rethrows anything else unchanged.

### Bootstrap / seeding
`InitService.onApplicationBootstrap` (`src/modules/init/`) seeds the default super-admin and member users from env vars (`SUPER_USER_*` / `MEMBER_USER_*`). It is gated by `SEED_ON_BOOT`, **skipped entirely in the Test env** (e2e specs seed their own fixtures via `src/utils/test-utils.ts` and reset the DB per test), and **create-only** — an existing account is never overwritten on reboot, so a manually changed role/active/password survives restarts. It logs a warning when seeding runs in Production (a reminder to change the sample credentials).

### Config
All env access goes through `EnvConfigService` (`src/modules/config/env-config.service.ts`) — typed getters wrapping `ConfigService.getOrThrow(...)`, never read `process.env` directly in app code. Validated at startup against `EnvConfigModel` (`class-validator`) via `ConfigModule.forRoot({ validate: validateEnv })`; invalid config logs every error and calls `process.exit(1)`. The `ToNumber`/`ToBoolean` transforms (`src/modules/config/transforms.ts`) intentionally leave empty/invalid input untouched so the validator rejects it instead of silently coercing a blank var to `0`/`false`.

### GraphQL client (Zeus) for testing
Tests don't hand-write GraphQL query strings. `schema.gql` is auto-written by the code-first `GraphQLModule` whenever the app boots (`autoSchemaFile`). `pnpm run api` (= `scripts/zeus.ts` → `scripts/zeus-generate.mjs`) then regenerates a fully-typed client into `src/utils/graphql/zeus` from that `schema.gql`. `src/utils/test-utils.ts` (`TestApiCaller`) wraps the generated client with helpers (`loginAs`, `setAdminMode`/`setMemberMode`, `resetDatabase`, `createAdminUser`, `query`, `mutation`, `extractGraphqlError`, …) used across e2e specs; `tests/e2e/helpers/e2e-app.ts` boots the full app mirroring `main.ts`. **After changing any resolver/DTO/model, boot the app once (to refresh `schema.gql`) and run `pnpm run api` to keep the Zeus client in sync before running e2e tests.**

### Logging
Logging uses the built-in Nest `Logger`; verbosity is set in `main.ts` by `NodeEnvType` (`src/modules/config/types/config.type.ts`) — full `log`/`debug`/`verbose` in `Development`, only `error`/`warn` otherwise. `PrismaService` emits SQL query logs only in `Development`. (There is no Loki/Prometheus/metrics wiring in this project.)

## Conventions worth knowing
- Commit messages: Husky + Commitizen with `cz-customizable`/gitmoji (`pnpm run prepare` once, then `git commit` triggers the interactive prompt).
- Indentation is 4 spaces, double quotes, no semicolons (see existing files) — match existing style; ESLint/Prettier enforce this (`eslint.config.js`, lint-staged runs `eslint --fix` on staged `*.ts`).
- Path alias `@src/*` maps to `src/*` (see `jest.config.js` moduleNameMapper and tsconfig paths) — always import via `@src/...`, not relative paths across modules.
