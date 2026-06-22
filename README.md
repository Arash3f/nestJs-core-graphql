<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>

  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Core project for the NestJS framework (GraphQL + Fastify + Prisma).

Stack: NestJS 11, Apollo Server 5 (`@nestjs/graphql` 13), Fastify 5, Prisma 7
(PostgreSQL via the `@prisma/adapter-pg` driver adapter), TypeScript 6.

## Requirements

- Node.js >= 20 (developed/tested on Node 24)
- pnpm >= 10
- A PostgreSQL database

## Installation

```bash
pnpm install
```

> On first install, pnpm asks to approve native build scripts (Prisma engines,
> SWC). They are pre-approved in `pnpm-workspace.yaml`.

Then generate the Prisma client and copy the environment file:

```bash
cp .env.sample .env.dev   # then fill in the values
pnpm exec prisma generate
```

> Prisma 7 note: the database connection URL is no longer stored in
> `schema.prisma`. It lives in `prisma.config.ts` (read from
> `DATABASE_CONNECTION_URL`) for CLI commands, and the running app connects
> through the pg driver adapter configured in `prisma.service.ts`.

## Husky

  For better commit messages, this project uses Husky with cz-customizable.

```bash
# prepare

$  pnpm  run  prepare

# use

$ git commit
```

## Running the app

```bash

# development mode

$  pnpm  run  start:dev

# production mode

$  pnpm  run  start:build
$  pnpm  run  start:prod

# watch mode

$  pnpm  run  start:dev
```

## Running the app with Docker

```bash

# development mode

$  docker compose -f "docker/develop/docker-compose-develop.yml" up --build

# production mode

$  docker compose -f "docker/production/docker-compose-production.yml" up --build
```

## Test

```bash

# migrate database

$  pnpm  run  test:migrate

# prepare api client

$  pnpm  run  api

# e2e tests

$  pnpm  run  test:e2e
 
# test coverage

$  pnpm  run  test:cov
```

## Documentation

```bash

# generate

$  pnpm  run  doc
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
