import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { JwtService } from "@nestjs/jwt"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"
import { FastifyAdapter } from "@nestjs/platform-fastify"
import { AppModule } from "@src/app.module"
import { CoreExceptionFilter } from "@src/common/filters/core-exception.filter"
import { TokenGuard } from "@src/common/guards/token.guard"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { EnvType } from "@src/modules/config/types/config.type"

/**
 * Webpack Hot Module Replacement (HMR) contract for Node.js bundles.
 *
 * @remarks
 * When HMR is enabled, Webpack injects a `module.hot` object that can:
 * - accept updated modules without restarting the process
 * - run cleanup logic before replacing the current module
 */
interface HotModule {
  hot: {
    accept: () => void
    dispose: (callback: () => Promise<void> | void) => void
  }
}
declare const module: HotModule

/**
 * main function for run app
 * @returns App
 */
async function bootstrap() {
  /**
   * `trustProxy: true` trusts the first proxy hop (e.g., behind Nginx) so that
   * `req.ip` and related fields can be resolved correctly. This is a Fastify
   * server option set at construction time — Fastify has no Express-style
   * `app.set("trust proxy", ...)` call.
   */
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  )
  const configService = app.get(EnvConfigService)

  setupGlobalValidation(app, configService)
  setupGlobalGuard(app)
  setupCors(app)
  setupLogger(app, configService)

  await app.listen(configService.serverPort, configService.serverAddress)

  /**
   * HMR support (development only).
   */
  if (module.hot) {
    module.hot.accept()
    module.hot.dispose(() => app.close())
  }

  return app
}

/**
 * Configures NestJS logger levels based on the runtime environment.
 *
 * @param app - NestJS application instance.
 * @param configService - Configuration provider.
 *
 * @remarks
 * - Development: enables detailed logs.
 * - Other environments: restricts output to warnings/errors.
 */
function setupLogger(app: NestFastifyApplication, configService: EnvConfigService) {
  app.useLogger(
    configService.nodeEnv === EnvType.Development
      ? ["log", "debug", "error", "verbose", "warn"]
      : ["error", "warn"],
  )
}

/**
 * Enables Cross-Origin Resource Sharing (CORS).
 *
 * @param app - NestJS application instance.
 */
function setupCors(app: NestFastifyApplication) {
  app.enableCors()
}

/**
 * Applies global validation pipeline and exception filter.
 *
 * @param app - NestJS application instance.
 * @param configService - Configuration provider.
 *
 * @remarks
 * - `transform: true` converts input payloads to DTO instances/types.
 * - `whitelist: true` removes unknown properties not present on the DTO.
 */
function setupGlobalValidation(app: NestFastifyApplication, configService: EnvConfigService) {
  app.useGlobalFilters(new CoreExceptionFilter(configService))
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
}

/**
 * Configures and registers global guards for the NestJS application.
 *
 * @description
 * This function sets up global guards that will be applied to all routes
 * across the entire application. Currently, it registers the `TokenGuard`
 * to handle JWT token validation and authentication for every incoming request.
 *
 * @param app - The NestJS Express application instance
 *
 * @see {@link TokenGuard} - The guard being registered globally
 */
function setupGlobalGuard(app: NestFastifyApplication) {
  const jwtService = app.get(JwtService)
  app.useGlobalGuards(new TokenGuard(jwtService))
}

void bootstrap()
