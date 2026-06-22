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

pnpm run test:migrate            # prisma db push against .env.test
pnpm run api                     # regenerate Zeus GraphQL client from schema.gql (after schema changes)
pnpm run test:e2e                # jest e2e tests (.env.test) — there are no unit tests, only e2e
pnpm run test:cov                # e2e tests with coverage

pnpm run prisma:migrate:dev      # prisma migrate dev (.env.dev)
pnpm run prisma:push:dev         # prisma db push (.env.dev)
```

To run a single e2e test file/case, pass jest filters through: `env-cmd -f ./.env.test jest --config jest.config.js -t "name of test"` or target the file path directly. Test files match `*.e2e.spec.ts` (see `jest.config.js`); there's currently only `src/modules/auth/auth.e2e.spec.ts`.

Before running e2e tests, `test:migrate` must have been run against the test DB, and the Zeus client (`src/utils/graphql/zeus`) must be in sync with `schema.gql` (`pnpm run api`) — tests call the API through the generated Zeus client, not raw fetch.

## Architecture

### Module shape
Each feature lives under `src/modules/<name>/` with `*.module.ts`, `*.resolver.ts` (GraphQL-facing), `*.service.ts` (business logic), `dto/` (GraphQL input/output classes), `model/` (GraphQL object types), `constants/errors.ts` (module's typed error catalog). `auth` is currently the only feature module (users/roles); `config`, `error`, `prisma`, `init` are infra modules wired in `app.module.ts`.

### Request pipeline
1. `TokenGuard` (`src/common/guards/token.guard.ts`) is registered **globally** in `main.ts` for every GraphQL request. It never throws — it decodes the JWT (if present) and stashes the result on `request.headers["_tokenGuard"]` as `{ user?, payload? }` or `{ tokenError }`. Always succeeds so unauthenticated queries (e.g. `logIn`) still work.
2. Per-resolver guards (`IsLoggedIn`, `IsAdmin` in `src/common/guards/`) read `_tokenGuard` off the request and decide access. They throw via `ErrorService.throwErrorToClient` when unauthorized — see `AuthErrors.AccessDenied` / `UserIsNotAuthorized`.
3. Resolvers extract user/request data via decorators (`@GetUserId()`, `@GetJwtToken()`, `@GetIp()` in `src/common/decorators/`), not by reaching into the raw context manually.

### Args/Input convention
Resolvers don't use raw `@Args()`. Use the wrappers in `src/common/args/`:
- `@DataArg(SomeInput)` → binds the GraphQL `data` argument to a DTO class.
- `@WhereRequirementArg(SomeInput)` / `@WhereOptionalArg(SomeInput)` → binds `where` (required vs. nullable).
- `@PaginationArg()`, `@SortByArg()` → standard pagination/sort args (see `src/common/input/pagination.input.ts`, `sort-by.input.ts`).

### Error handling
Errors are NOT thrown as plain `Error`/`HttpException` — each module defines a typed catalog in `constants/errors.ts` (e.g. `AuthErrors`) with `{ code, module, message, persianTranslation, statusCode }`. On app bootstrap, `AppModule` registers all module error catalogs into `ErrorService`'s `translationMap` via `InitService.generateProjectErrors`. Services throw with `this.error.throwErrorToClient({ errorData: AuthErrors.UserNotFound })`, which wraps the catalog entry in a `GlobalError` (HttpException). `ErrorService.errorFilter` (wired as Apollo's `formatError` in `app.module.ts`) strips internal fields (message/code/module/stack) in production (`NODE_ENV=production`) and logs full error detail in development. When adding a new error, add it to the relevant module's error catalog object — it's picked up automatically as long as the catalog is included in `generateProjectErrors()` in `app.module.ts`.

### Bootstrap / seeding
`AppModule`'s constructor always registers error catalogs, and (outside of `NodeEnvType.Test`) seeds a super-admin user from env vars (`SUPER_USER_*`) via `InitService.generateSuperUserWithAdminRole`. Test mode skips auto-seeding; `auth.e2e.spec.ts` seeds its own super/member users per-test through `fetchService` (`src/utils/graphql/fetcher.ts`) for isolation.

### GraphQL client (Zeus) for testing
Tests don't hand-write GraphQL query strings. `pnpm run api` (= `scripts/zeus.ts`) regenerates a fully-typed client into `src/utils/graphql/zeus` from `schema.gql`. `src/utils/graphql/fetcher.ts` wraps a `Thunder` instance from that client (`fetchService`) with helpers (`loginAs`, `setAdminMode`, `resetDatabase`, `query`, `mutation`, etc.) used across e2e specs. **After changing any resolver/DTO/model, run `pnpm run api` to keep the Zeus client and `schema.gql` in sync before running e2e tests.**

### Config
All env access goes through `EnvConfigService` (`src/modules/config/env-config.service.ts`) — typed getters wrapping `ConfigService.get(...)`, never read `process.env` directly in app code. Validated at startup against `EnvConfigModel` (`class-validator`) in `ConfigModule.forRoot({ validate: ... })`; invalid config calls `process.exit(1)`.

### Observability
Loki logging (`nestjs-loki-logger`) and Prometheus metrics (`@willsoto/nestjs-prometheus`, exposed at `/metrics`) are wired globally in `app.module.ts`. Logger verbosity depends on `NodeEnvType` (`src/modules/config/types/config.type.ts`): verbose/debug logs and SQL query logging (in `PrismaService`) only run in `Development`.

## Conventions worth knowing
- Commit messages: Husky + Commitizen with `cz-customizable`/gitmoji (`pnpm run prepare` once, then `git commit` triggers the interactive prompt).
- Indentation is 4 spaces, double quotes, no semicolons (see existing files) — match existing style; ESLint/Prettier enforce this (`eslint.config.mjs`, lint-staged runs `eslint --fix` on staged `*.ts`).
- Path alias `@src/*` maps to `src/*` (see `jest.config.js` moduleNameMapper and tsconfig paths) — always import via `@src/...`, not relative paths across modules.
