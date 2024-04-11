import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"

/**
 * * Decorator to get the requester's Token
 */
export const GetRequesterToken = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context)
        const request = ctx.getContext().req
        const authorization = request.headers["authorization"] || ""
        const token = authorization.replace("bearer ", "").replace("jwt ", "")
        return token
    },
)
