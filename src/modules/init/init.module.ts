import { Module } from "@nestjs/common"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { InitService } from "@src/modules/init/init.service"
import { PrismaModule } from "@src/modules/prisma/prisma.module"

@Module({
  providers: [InitService],
  imports: [PrismaModule, EnvConfigModule],
  exports: [InitService],
})
export class InitModule {}
