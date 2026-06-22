import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { validateEnv } from "@src/modules/config/validate-env"

@Module({
  providers: [EnvConfigService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      /**
       * Custom validation function for environment variables.
       * Validates all environment variables before they are used elsewhere.
       * If validation fails, the application will exit with status code 1.
       *
       * @see {@link validateEnv}
       */
      validate: validateEnv,
    }),
  ],

  exports: [EnvConfigService],
})
export class EnvConfigModule {}
