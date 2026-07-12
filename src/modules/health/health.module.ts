import { Module } from "@nestjs/common"
import { HealthController } from "@src/modules/health/health.controller"
import { PrismaModule } from "@src/modules/prisma/prisma.module"

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
