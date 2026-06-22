import { Injectable, Logger } from "@nestjs/common"
import { Role } from "@prisma/client"
import { CreateUserInput } from "@src/modules/auth/dto/create-user.input"
import type { ErrorInfo } from "@src/modules/error/constants/type"
import { ErrorService } from "@src/modules/error/error.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { hashPassword } from "@src/utils/password"

@Injectable()
export class InitService {
    constructor(
        private error: ErrorService,
        private prisma: PrismaService,
    ) {}

    private readonly logger = new Logger(InitService.name)

    /**
     * * Generate all project errors
     * @param projectErrors Collection of errors
     * @returns The result of the operation
     */
    generateProjectErrors(projectErrors: ErrorInfo[]): boolean {
        for (const errInfo of projectErrors) {
            this.error.createNewErrorTranslation(errInfo)
        }
        this.logger.log("All project errors were created Successfully")

        return true
    }

    /**
     * * Generate Super User With Admin Role
     * @param superUserData SuperUser Data
     */
    async generateSuperUserWithAdminRole(
        superUserData: CreateUserInput,
    ): Promise<void> {
        /**
         * ? Find Super User
         */
        let adminUser = await this.prisma.users.findFirst({
            where: { username: superUserData.username },
        })

        /**
         * ! Admin User not Found ---> Create Admin User
         */
        if (!adminUser?.id) {
            superUserData.password = await hashPassword(superUserData.password)

            adminUser = await this.prisma.users.create({
                data: superUserData,
            })
        }

        /**
         * ? Connect role To Admin User
         */
        await this.prisma.users.update({
            where: {
                id: adminUser.id,
            },
            data: {
                role: Role.Admin,
                active: true,
            },
        })
    }
}
