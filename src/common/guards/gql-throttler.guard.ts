import type { ExecutionContext } from "@nestjs/common"
import { Injectable } from "@nestjs/common"
import { type GqlContextType, GqlExecutionContext } from "@nestjs/graphql"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { FastifyReply, FastifyRequest } from "fastify"

/**
 * ThrottlerGuard adapted for GraphQL + Fastify.
 *
 * @remarks
 * Nest's default {@link ThrottlerGuard} only reads the HTTP switch. GraphQL
 * operations expose the Fastify request/reply on the Apollo context, so this
 * subclass remaps them before the rate-limit check runs.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>
    res: Record<string, unknown>
  } {
    if (context.getType<GqlContextType>() === "graphql") {
      const ctx = GqlExecutionContext.create(context).getContext<{
        req: FastifyRequest
        reply: FastifyReply
      }>()

      return {
        req: ctx.req as unknown as Record<string, unknown>,
        res: ctx.reply as unknown as Record<string, unknown>,
      }
    }

    const http = context.switchToHttp()
    return {
      req: http.getRequest<FastifyRequest>() as unknown as Record<string, unknown>,
      res: http.getResponse<FastifyReply>() as unknown as Record<string, unknown>,
    }
  }
}
