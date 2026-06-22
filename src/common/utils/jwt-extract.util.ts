import type { FastifyRequest } from "fastify"

/**
 * Extracts a JWT from the request's `Authorization` header.
 *
 * @remarks
 * Accepts both a bare token and a scheme-prefixed token:
 * - `Authorization: <token>` (single value, returned as-is)
 * - `Authorization: Bearer <token>` / `Authorization: JWT <token>` (scheme is case-insensitive)
 *
 * Any other shape (missing header, unknown scheme, more than two parts) yields an empty string.
 *
 * @param req - The incoming Fastify request (taken from the GraphQL context).
 * @returns The extracted token, or an empty string `""` when none is present.
 */
export function getJwtFromRequest(req: FastifyRequest): string {
  const authorization = req.headers.authorization?.trim()
  if (!authorization) return ""

  const parts = authorization.split(/\s+/)

  if (parts.length === 1) {
    return parts[0].trim()
  }

  if (parts.length === 2) {
    const [scheme, token] = parts

    if (/^(bearer|jwt)$/i.test(scheme)) {
      return token.trim()
    }
  }

  return ""
}
