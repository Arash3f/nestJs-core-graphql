import { ExecutionContext, Injectable } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { FastifyReply, FastifyRequest } from "fastify"

/**
 * ThrottlerGuard adapted for GraphQL + Fastify.
 *
 * The default ThrottlerGuard reads req/res from the HTTP context, which is
 * not available in a GraphQL execution context. This subclass overrides
 * `getRequestResponse` to pull them from the GQL context instead.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context).getContext<{
      req: FastifyRequest
      res: FastifyReply
    }>()
    return { req: ctx.req, res: ctx.res }
  }
}
