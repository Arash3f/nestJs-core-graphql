import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { JwtService } from "@nestjs/jwt"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"
import { FastifyAdapter } from "@nestjs/platform-fastify"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "@src/app.module"
import { TokenGuard } from "@src/common/guards/token.guard"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { NodeEnvType } from "@src/modules/config/types/config.type"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import type { ServerResponse } from "http"

declare const module: any

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    )
    const configService = app.get(EnvConfigService)

    setupGlobalValidation(app)
    setupGlobalGuard(app)
    setupCors(app)
    setupLogger(app, configService)

    await app.listen(configService.serverPort, "0.0.0.0")

    if (module.hot) {
        module.hot.accept()
        module.hot.dispose(() => app.close())
    }

    return app
}

/**
 * * Config project logger
 * @param app Nest Application object
 * @param configService Application Env object
 */
function setupLogger(
    app: NestFastifyApplication,
    configService: EnvConfigService,
) {
    app.useLogger(
        configService.nodeEnv === NodeEnvType.Development
            ? ["log", "debug", "error", "verbose", "warn"]
            : [],
    )
}

/**
 * * Enable Cors
 * @param app Nest Application object
 */
function setupCors(app: NestFastifyApplication) {
    app.enableCors()
}

/**
 * * Set Global Validation
 * @param app Nest Application object
 * @param configService Application Env object
 */
function setupGlobalValidation(app: NestFastifyApplication) {
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
        }),
    )
}

/**
 * * Use global guard for all client requests
 * @param app Nest Application object
 */
function setupGlobalGuard(app: NestFastifyApplication) {
    const prismaService = app.get(PrismaService)
    const jwtService = app.get(JwtService)
    const apiConfigService = app.get(EnvConfigService)
    app.useGlobalGuards(
        new TokenGuard(jwtService, prismaService, apiConfigService),
    )
}

bootstrap()
