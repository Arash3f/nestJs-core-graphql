import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo"
import { Module } from "@nestjs/common"
import { GraphQLModule } from "@nestjs/graphql"
import { ThrottlerModule } from "@nestjs/throttler"
import type { ErrorResponseBody } from "@src/common/filters/core-exception.type"
import { AuthModule } from "@src/modules/auth/auth.module"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { EnvType } from "@src/modules/config/types/config.type"
import { HealthModule } from "@src/modules/health/health.module"
import { InitModule } from "@src/modules/init/init.module"
import { PrismaModule } from "@src/modules/prisma/prisma.module"
import { UserModule } from "@src/modules/user/user.module"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { GraphQLFormattedError } from "graphql"
import depthLimit from "graphql-depth-limit"
import { createComplexityRule, simpleEstimator } from "graphql-query-complexity"

/** Maximum GraphQL selection-set nesting depth accepted by the server. */
const GRAPHQL_MAX_DEPTH = 7

/** Maximum estimated query complexity accepted by the server. */
const GRAPHQL_MAX_COMPLEXITY = 1000

@Module({
  imports: [
    PrismaModule,
    EnvConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [EnvConfigModule],
      inject: [EnvConfigService],
      useFactory: (env: EnvConfigService) => ({
        skipIf: () => env.nodeEnv === EnvType.Test,
        throttlers: [{ name: "default", ttl: env.throttleTtlMs, limit: env.throttleLimit }],
      }),
    }),
    AuthModule,
    UserModule,
    InitModule,
    HealthModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [EnvConfigModule],
      inject: [EnvConfigService],
      useFactory: (env: EnvConfigService) => ({
        autoSchemaFile: "schema.gql",
        introspection: env.nodeEnv !== EnvType.Production,
        // Expose both req and res in the GraphQL context so guards (e.g.
        // GqlThrottlerGuard) can read/write Fastify request/reply objects.
        // @as-integrations/fastify calls contextFunction(request, reply) as
        // two positional args, not as a single { request, reply } object.
        context: (request: FastifyRequest, reply: FastifyReply) => ({
          req: request,
          res: reply,
        }),
        validationRules: [
          depthLimit(GRAPHQL_MAX_DEPTH),
          createComplexityRule({
            maximumComplexity: GRAPHQL_MAX_COMPLEXITY,
            estimators: [simpleEstimator({ defaultComplexity: 1 })],
          }),
        ],
        // CoreExceptionFilter already normalizes every thrown exception into an
        // ErrorResponseBody and stows it under extensions.originalError, stripping
        // debug fields in production. formatError just promotes that body to the
        // top-level extensions so clients don't have to dig through originalError.
        formatError: (formattedError: GraphQLFormattedError) => {
          const originalError = formattedError.extensions?.originalError as
            | ErrorResponseBody
            | undefined

          if (!originalError) return formattedError

          return {
            ...formattedError,
            message: originalError.message,
            extensions: originalError,
          }
        },
      }),
    }),
  ],
})
export class AppModule {}
