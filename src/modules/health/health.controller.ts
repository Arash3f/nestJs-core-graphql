import { Controller, Get, ServiceUnavailableException } from "@nestjs/common"
import { PrismaService } from "@src/modules/prisma/prisma.service"

/**
 * Liveness/readiness probe for orchestrators and load balancers.
 *
 * @remarks
 * Kept as a plain HTTP endpoint (not GraphQL) so load balancers can hit
 * `GET /health` without speaking GraphQL.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns OK when the process is up and the database is reachable.
   *
   * @returns Health status, database connectivity, and timestamp.
   * @throws {ServiceUnavailableException} When the database cannot be reached.
   */
  @Get()
  async check() {
    const timestamp = new Date().toISOString()

    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: "ok", database: "ok", timestamp }
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "down",
        timestamp,
      })
    }
  }
}
