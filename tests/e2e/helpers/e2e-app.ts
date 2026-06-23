import type { INestApplication } from "@nestjs/common"
import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { JwtService } from "@nestjs/jwt"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"
import { FastifyAdapter } from "@nestjs/platform-fastify"
import { AppModule } from "@src/app.module"
import { CoreExceptionFilter } from "@src/common/filters/core-exception.filter"
import { TokenGuard } from "@src/common/guards/token.guard"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"

/**
 * Bag of objects an e2e spec needs after the application is bootstrapped.
 */
export interface E2eContext {
  app: INestApplication
  prisma: PrismaService
  apiConfig: EnvConfigService
}

/**
 * Boots the full `AppModule` over HTTP for e2e tests, wiring the same global
 * validation pipe, exception filter and token guard as `src/main.ts` so the
 * running app behaves identically to production.
 *
 * The `TokenGuard` is registered globally here (it is applied via
 * `app.useGlobalGuards` in `main.ts`, not via `APP_GUARD`), so without this the
 * non-blocking JWT decoding that populates `req.user` would never run and every
 * guarded route would reject as unauthorized.
 *
 * The app listens on `EnvConfigService.serverPort`; because every spec binds
 * that single port, the e2e suite must run serially.
 *
 * @returns An object containing:
 * - `app`       - the started Nest application (close it in `afterAll`)
 * - `prisma`    - the shared `PrismaService` for seeding/asserting
 * - `apiConfig` - the typed env-config service
 *
 * @example
 * ```ts
 * const ctx = await createE2eApp()
 * api.setApiConfig(ctx.apiConfig)
 * api.setPrismaClient(ctx.prisma)
 * ```
 */
export async function createE2eApp(): Promise<E2eContext> {
  // Mirror `src/main.ts`: the app runs on Fastify, and `trustProxy` is a
  // Fastify construction option (there is no Express-style `app.set`).
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { logger: false },
  )

  const apiConfig = app.get(EnvConfigService)
  const prisma = app.get(PrismaService)
  const jwt = app.get(JwtService)

  app.useGlobalFilters(new CoreExceptionFilter(apiConfig))
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.useGlobalGuards(new TokenGuard(jwt))

  await app.listen(apiConfig.serverPort, apiConfig.serverAddress)

  return { app, prisma, apiConfig }
}
