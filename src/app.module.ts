import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo"
import { Module } from "@nestjs/common"
import { GraphQLModule } from "@nestjs/graphql"
import type { ErrorResponseBody } from "@src/common/filters/core-exception.type"
import { AuthModule } from "@src/modules/auth/auth.module"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { InitModule } from "@src/modules/init/init.module"
import { PrismaModule } from "@src/modules/prisma/prisma.module"
import { UserModule } from "@src/modules/user/user.module"
import type { GraphQLFormattedError } from "graphql"

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    EnvConfigModule,
    InitModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: "schema.gql",
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
  ],
})
export class AppModule {}
