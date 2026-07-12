import { Module } from "@nestjs/common"
import { GuardsModule } from "@src/common/guards/guards.module"
import { AuthModule } from "@src/modules/auth/auth.module"
import { PrismaModule } from "@src/modules/prisma/prisma.module"
import { UserResolver } from "@src/modules/user/user.resolver"
import { UserService } from "@src/modules/user/user.service"

@Module({
  providers: [UserService, UserResolver],
  imports: [PrismaModule, AuthModule, GuardsModule],
  exports: [UserService],
})
export class UserModule {}
