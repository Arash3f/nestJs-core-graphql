import { Module } from "@nestjs/common"
import { IsAdminGuard } from "@src/common/guards/is-admin.guard"
import { IsLoggedInGuard } from "@src/common/guards/is-logged-in.guard"
import { PrismaModule } from "@src/modules/prisma/prisma.module"

/**
 * Registers route guards that depend on {@link PrismaService} so Nest can inject
 * dependencies when they are referenced via `@UseGuards(...)`.
 */
@Module({
  imports: [PrismaModule],
  providers: [IsLoggedInGuard, IsAdminGuard],
  exports: [IsLoggedInGuard, IsAdminGuard],
})
export class GuardsModule {}
