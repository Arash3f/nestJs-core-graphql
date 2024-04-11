import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { AuthResolver } from "@src/modules/auth/auth.resolver"
import { AuthService } from "@src/modules/auth/auth.service"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { ErrorModule } from "@src/modules/error/error.module"
import { PrismaModule } from "@src/modules/prisma/prisma.module"

@Module({
    providers: [AuthService, AuthResolver],
    imports: [
        ErrorModule,
        PrismaModule,
        EnvConfigModule,
        JwtModule.registerAsync({
            imports: [EnvConfigModule],
            useFactory: (apiConfigService: EnvConfigService) => ({
                privateKey: apiConfigService.jwtSecret,
                signOptions: {
                    expiresIn: apiConfigService.jwtExpire,
                },
            }),
            inject: [EnvConfigService],
        }),
    ],
    exports: [AuthService, AuthResolver, JwtModule],
})
export class AuthModule {}
