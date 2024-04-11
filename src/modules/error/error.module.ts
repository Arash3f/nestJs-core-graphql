import { Module } from "@nestjs/common"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { ErrorService } from "@src/modules/error/error.service"

@Module({
    providers: [ErrorService],
    imports: [EnvConfigModule],
    exports: [ErrorService],
})
export class ErrorModule {}
