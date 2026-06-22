import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo"
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ScheduleModule } from "@nestjs/schedule"
import { AuthModule } from "@src/modules/auth/auth.module"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { CreateUserInput } from "@src/modules/auth/dto/create-user.input"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { NodeEnvType } from "@src/modules/config/types/config.type"
import type { ErrorInfo } from "@src/modules/error/constants/type"
import { ErrorModule } from "@src/modules/error/error.module"
import { ErrorService } from "@src/modules/error/error.service"
import { InitModule } from "@src/modules/init/init.module"
import { InitService } from "@src/modules/init/init.service"
import { PrismaModule } from "@src/modules/prisma/prisma.module"
import { PrometheusModule } from "@willsoto/nestjs-prometheus"
import { LokiLoggerModule } from "nestjs-loki-logger"

@Module({
    imports: [
        LokiLoggerModule.forRootAsync({
            imports: [EnvConfigModule],
            inject: [EnvConfigService],
            useFactory: (apiConfigService: EnvConfigService) => ({
                lokiUrl: apiConfigService.lokiServerAddress,
                labels: {
                    label: "testing",
                },
                logToConsole: true,
                gzip: false,
            }),
        }),
        PrometheusModule.register({
            path: "/metrics",
        }),
        ConfigModule.forRoot({
            validate: (config) =>
                EnvConfigService.environmentValidation(config),
        }),
        ScheduleModule.forRoot(),
        PrismaModule,
        AuthModule,
        ErrorModule,
        EnvConfigModule,
        InitModule,
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            driver: ApolloDriver,
            imports: [EnvConfigModule],
            inject: [EnvConfigService],
            // The factory injects EnvConfigService so that errorFilter can read
            // the real NODE_ENV. Previously formatError was passed statically,
            // so its second argument was Apollo's error object (not the config)
            // and production never hid internal error details.
            useFactory: (apiConfigService: EnvConfigService) => ({
                autoSchemaFile: "schema.gql",
                formatError: (formattedError) =>
                    ErrorService.errorFilter(formattedError, apiConfigService),
            }),
            // CORS is configured globally in main.ts (app.enableCors). The
            // GraphQL driver no longer accepts a `cors` option in
            // @nestjs/apollo v13 / Apollo Server 5.
        }),
    ],
})
export class AppModule {
    constructor(
        private init: InitService,
        private apiConfigService: EnvConfigService,
    ) {
        this.generateProjectErrors()
        if (apiConfigService.nodeEnv !== NodeEnvType.Test) {
            this.projectSuperUser()
        }
    }

    /**
     * * Generate Project Errors
     */
    generateProjectErrors() {
        const projectErrors: ErrorInfo[] = [...Object.values(AuthErrors)]
        this.init.generateProjectErrors(projectErrors)
    }

    /**
     * * Generate Super User With Admin Role
     */
    async projectSuperUser() {
        const superUserData: CreateUserInput = {
            username: this.apiConfigService.defaultSuperUser.username,
            name: this.apiConfigService.defaultSuperUser.name,
            password: this.apiConfigService.defaultSuperUser.password,
            role: this.apiConfigService.defaultSuperUser.role,
        }
        await this.init.generateSuperUserWithAdminRole(superUserData)
    }
}
