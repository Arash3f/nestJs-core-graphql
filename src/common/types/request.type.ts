import type { FastifyRequest } from "fastify"

export type RequestUser = {
  id: string
  username?: string
}

export type AuthenticatedRequest = FastifyRequest & {
  user?: RequestUser
}

/**
 * This type is used to generate jwt token without any field
 */
export type JwtPayload = {
  id: string
  username?: string
  /** Device fingerprint the token is bound to (sha256 of the User-Agent). */
  deviceId?: string
  iat?: number
  exp?: number
}

export type Tokens = {
  accessToken: string
  refreshToken: string
}
