import {
    CanActivate,
    ExecutionContext,
    forwardRef,
    Inject,
    Injectable,
} from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { JwtService } from "@nestjs/jwt"
import { JwtType, TokenGuardData } from "@src/common/types/token.type"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"

/**
 * * This guard performs several activities
 *
 * * 1) Check token (It does not throw error for invalid token)
 * * 2) Set requester Object in header (If exist)
 * * 3) Push data in requester header (In _tokenGuard)
 *
 * !Note: This guard is used globaly in all requests
 *
 */
@Injectable()
export class TokenGuard implements CanActivate {
    constructor(
        @Inject(forwardRef(() => JwtService))
        private jwt: JwtService,
        private prisma: PrismaService,
        private apiConfigService: EnvConfigService,
    ) {}

    async canActivate(context: ExecutionContext) {
        const requestCheck = context.switchToHttp().getRequest();

        if (requestCheck) {
            return true
        }
        const ctx = GqlExecutionContext.create(context)
        const request: Request = ctx.getContext().req
        const authorization = request.headers["authorization"] || ""

        /**
         * * Get User's Token
         */
        const token = authorization.replace("bearer ", "").replace("jwt ", "")

        try {
            const bodyData: JwtType = this.jwt.verify(token, {
                secret: this.apiConfigService.jwtSecret,
                ignoreExpiration: true,
            })
            const tokenData: TokenGuardData = {}

            if (bodyData) {
                const userId = bodyData.id
                const foundUser = await this.prisma.users.findUnique({
                    where: { id: userId },
                })

                /**
                 * * Set user's object in requester's header
                 */
                if (foundUser && foundUser.active) {
                    tokenData.user = {
                        id: foundUser.id,
                        active: foundUser.active,
                        username: foundUser.username,
                        role: foundUser.role,
                    }
                    tokenData.payload = {
                        jwtInitDate: bodyData.iat,
                    }
                }

                /**
                 * ! Save data in requester's header
                 */
                request.headers["_tokenGuard"] = tokenData
            }
        } catch (tokenError) {
            /**
             * ! If requester does not have a token or it is empty
             */
            const tokenData: TokenGuardData = { tokenError }
            request.headers["_tokenGuard"] = tokenData
        }

        return true
    }
}
