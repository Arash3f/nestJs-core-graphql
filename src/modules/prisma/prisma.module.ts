import { Module } from "@nestjs/common"
import { EnvConfigModule } from "@src/modules/config/env-config.module"
import { PrismaService } from "@src/modules/prisma/prisma.service"

@Module({
  exports: [PrismaService],
  imports: [EnvConfigModule],
  providers: [PrismaService],
})
export class PrismaModule {}
