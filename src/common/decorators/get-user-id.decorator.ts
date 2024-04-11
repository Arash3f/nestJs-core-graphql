import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"

/**
 * * Decorator to get the requester's UserId,
 * ! Note: this decorator does not authenticate requester
 */
export const GetUserId = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context)
        const request = ctx.getContext().req
        const userId = request.headers._tokenGuard.user.id
        return userId
    },
)
