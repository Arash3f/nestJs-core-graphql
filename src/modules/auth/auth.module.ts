import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { AuthResolver } from "@src/modules/auth/auth.resolver"
import { AuthService } from "@src/modules/auth/auth.service"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaModule } from "@src/modules/prisma/prisma.module"

@Module({
  providers: [AuthService, AuthResolver],
  imports: [
    PrismaModule,
    EnvConfigModule,
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      useFactory: (apiConfigService: EnvConfigService) => ({
        secret: apiConfigService.jwtSecret,
        signOptions: { expiresIn: apiConfigService.jwtAccessExpire },
      }),
      inject: [EnvConfigService],
    }),
  ],
  exports: [AuthService],
})
export class AuthModule {}
