import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"

/**
 * * Decorator to get the requester's IP
 */
export const GetRequesterIp = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context)
        const requesterIp = ctx.getContext().req.ip
        return requesterIp.split(":")[3]
    },
)
