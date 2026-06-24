<h1 align="center">NestJS Core GraphQL</h1>

<p align="center">
  A production-ready NestJS starter — GraphQL (code-first) on Fastify, with Prisma 7, JWT auth & RBAC, typed error handling, and built-in observability.
</p>

<p align="center">
  <a href="http://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="Apollo" src="https://img.shields.io/badge/Apollo_Server-5-311C87?logo=apollographql&logoColor=white">
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## ✨ Overview

A batteries-included backend core for building GraphQL APIs with NestJS. The
schema is **code-first** (auto-generated to `schema.gql`), the HTTP layer runs
on **Fastify**, and persistence is handled by **Prisma 7** using the
`@prisma/adapter-pg` driver adapter against **PostgreSQL**.

It ships with the plumbing most projects rewrite every time:

- 🔐 **Auth & RBAC** — JWT access/refresh tokens, Argon2 password hashing,
  `Admin` / `Member` roles, and guard-based access control.
- 🧩 **Typed error catalog** — every module declares its own errors (code,
  HTTP status, message, Persian translation) and they're normalized into a
  single GraphQL error shape, with internal details stripped in production.
- 🧪 **Typed tests** — e2e specs talk to the API through a generated
  [Zeus](https://github.com/graphql-editor/graphql-zeus) client, plus unit tests
  for guards, filters, pipes and utils.
- 🔒 **Device-bound sessions** — issued JWTs carry a `deviceId` claim derived
  from the caller's `User-Agent` (SHA-256). A token replayed from a different
  device is silently rejected. This is a soft binding (defense-in-depth), not a
  hardware-level guarantee.
- 🛡 **Rate limiting** — `logIn` (5 req/min) and `register` (3 req/min) are
  protected by `@nestjs/throttler` via a Fastify/GQL-aware guard.
- ⚡ **Fast DX** — webpack HMR dev server, ESLint + Prettier, Husky +
  Commitizen (gitmoji) commit prompts.

## 🛠 Tech stack

| Layer            | Technology                                                      |
| ---------------- | -------------------------------------------------------------- |
| Framework        | NestJS 11                                                      |
| GraphQL          | Apollo Server 5 + `@nestjs/graphql` 13 (code-first)           |
| HTTP server      | Fastify 5                                                      |
| ORM              | Prisma 7 (`@prisma/adapter-pg` driver adapter)                |
| Database         | PostgreSQL                                                     |
| Auth             | `@nestjs/jwt`, Argon2                                          |
| Language / build | TypeScript 6, SWC, webpack (HMR)                              |
| Tooling          | pnpm, ESLint, Prettier, Husky, Commitizen, Jest               |

## 📦 Requirements

- **Node.js** ≥ 20 (developed/tested on Node 24)
- **pnpm** ≥ 10
- A **PostgreSQL** database (local or Docker — see below)

## 🚀 Getting started

```bash
# 1. Install dependencies
pnpm install
```

> On first install, pnpm asks to approve native build scripts (Prisma engines,
> SWC). They are pre-approved in `pnpm-workspace.yaml`.

```bash
# 2. Create your environment file and fill in the values
cp .env.sample .env.dev

# 3. Generate the Prisma client
pnpm exec prisma generate

# 4. Apply the schema to your database
pnpm run prisma:push:dev      # or: pnpm run prisma:migrate:dev

# 5. Start the dev server (webpack HMR)
pnpm run start:dev
```

The GraphQL API is then served at **`http://<SERVER_ADDRESS>:<SERVER_PORT>/graphql`**
(defaults to `0.0.0.0:3000`).

> **Prisma 7 note:** the database connection URL is no longer stored in
> `schema.prisma`. It lives in `prisma.config.ts` (read from
> `DATABASE_CONNECTION_URL`) for CLI commands, and the running app connects
> through the pg driver adapter configured in
> `src/modules/prisma/prisma.service.ts`.

## ⚙️ Environment variables

Copy `.env.sample` and fill it in. Key groups:

| Variable                          | Description                                          |
| --------------------------------- | ---------------------------------------------------- |
| `NODE_ENV`                        | `Development` / `Production` / `Test`               |
| `SERVER_ADDRESS`, `SERVER_PORT`   | Bind address & port (default `0.0.0.0:3000`)        |
| `DATABASE_CONNECTION_URL`         | Full Postgres connection string (only URL needed)   |
| `JWT_SECRET`                      | Secret used to sign JWTs                             |
| `JWT_ACCESS_EXPIRE`, `JWT_REFRESH_EXPIRE` | Token lifetimes (seconds)                   |
| `SEED_ON_BOOT`                    | Seed the super-admin user on startup (`true`/`false`) |
| `SUPER_USER_*`                    | Default super-admin credentials seeded on boot      |
| `MEMBER_USER_*`                   | Default member credentials seeded on boot           |
| `PASSWORD_HASH_*`                 | Argon2 memory/time/parallelism cost params          |

All env access goes through the typed `EnvConfigService` and is validated at
startup; invalid config aborts the process.

## 🐳 Running with Docker

A development Docker setup is provided under `docker/develop/`:

```bash
# copy the sample docker env files first
cp docker/develop/.env.docker.dev.sample docker/develop/.env.docker.dev
cp docker/develop/.docker.dev.sample.env docker/develop/.docker.dev.env

# build & run
docker compose -f docker/develop/docker-compose-develop.yml up --build
```

## 🏗 Project structure

```
src/
├── common/            # Shared building blocks
│   ├── decorators/    # @GetUserId, @GetJwtToken, @GetIp, @GetDeviceFingerprint
│   ├── dto/           # PaginationData, SortByData, IdInput, SuccessOutput
│   ├── guards/        # TokenGuard (global), IsLoggedIn, IsAdmin, GqlThrottlerGuard
│   ├── filters/       # Exception normalization (CoreExceptionFilter)
│   └── utils/         # device-fingerprint, jwt-extract
├── modules/
│   ├── auth/          # logIn, register, logout, changePassword, refreshToken
│   ├── user/          # me, updateMe, createUser, readUsers, updateUser, deleteUser
│   ├── config/        # EnvConfigService + validation
│   ├── prisma/        # PrismaService (pg driver adapter)
│   └── init/          # Super-user seeding on boot
├── utils/graphql/     # Generated Zeus client + fetcher helpers (for tests)
└── main.ts            # Bootstrap, global TokenGuard, listen
```

### Request pipeline

1. **`TokenGuard`** runs globally on every GraphQL request. It never throws —
   it decodes the JWT (if present) and, when the token verifies and its
   `deviceId` claim matches the caller's device fingerprint, sets `req.user`.
   A missing or invalid token leaves `req.user` unset, so unauthenticated
   queries (e.g. `logIn`) still work.
2. **Per-resolver guards** (`IsLoggedIn`, `IsAdmin`) read `req.user` and throw
   typed `AppException`s when access is denied. Both hit the DB on every call
   so a deactivated account is locked out immediately, even with a valid token.
3. **Resolvers** pull user/request data via param decorators (`@GetUserId()`,
   `@GetJwtToken()`, `@GetIp()`, `@GetDeviceFingerprint()`) and bind args with
   plain `@Args("data" | "where" | "pagination" | "sortBy")`.

## 🧪 Testing

Tests are **e2e** (`*.e2e.spec.ts`) and call the API through the generated Zeus
client, so the client and `schema.gql` must be in sync first. They run against
the test database defined in `.env.test`.

```bash
# 1. Prepare the test database (push the schema against .env.test)
env-cmd -f ./.env.test prisma db push

# 2. (Re)generate the typed Zeus client from schema.gql
pnpm run api

# 3. Run the e2e tests (uses .env.test)
pnpm run test

# ...or with coverage
pnpm run test:cov
```

> Run a single test by name:
> `env-cmd -f ./.env.test jest --config jest.config.js -t "name of test"`

## 📜 Useful scripts

| Command                        | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `pnpm run start:dev`           | Dev server with webpack HMR (`.env.dev`)             |
| `pnpm run start:build`         | Production build (`.env.prod`)                       |
| `pnpm run start:prod`          | Run the production build                             |
| `pnpm run lint`                | ESLint with `--fix`                                  |
| `pnpm run typecheck`           | `tsc --noEmit`                                        |
| `pnpm run format`              | Prettier                                             |
| `pnpm run api`                 | Regenerate the Zeus GraphQL client from `schema.gql` |
| `pnpm run prisma:migrate:dev`  | `prisma migrate dev` (`.env.dev`)                    |
| `pnpm run prisma:push:dev`     | `prisma db push` (`.env.dev`)                        |
| `pnpm run studio:dev`          | Open Prisma Studio (`.env.dev`)                      |
| `pnpm run test`                | Run e2e tests (`.env.test`)                          |
| `pnpm run test:cov`            | e2e tests with coverage                              |

## 📝 Commit conventions

This project uses **Husky + Commitizen** with `cz-customizable` (gitmoji-style).

```bash
pnpm run prepare   # one-time setup
git commit         # launches the interactive commit prompt
```

> **Style:** 4-space indentation, double quotes, **no semicolons**. ESLint +
> Prettier enforce this on staged files via lint-staged.

## 📄 License

[MIT](LICENSE) © Arash Alfooneh
