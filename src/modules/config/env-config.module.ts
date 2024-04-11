import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { EnvConfigService } from "@src/modules/config/env-config.service"

@Module({
    providers: [EnvConfigService],
    imports: [ConfigModule],
    exports: [EnvConfigService],
})
export class EnvConfigModule {}
