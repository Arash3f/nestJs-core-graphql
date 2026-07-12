import { ServiceUnavailableException } from "@nestjs/common"
import { HealthController } from "@src/modules/health/health.controller"
import type { PrismaService } from "@src/modules/prisma/prisma.service"

describe("HealthController", () => {
  const queryRaw = jest.fn()
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService
  const controller = new HealthController(prisma)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns ok when the database responds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }])

    const result = await controller.check()

    expect(result.status).toBe("ok")
    expect(result.database).toBe("ok")
    expect(typeof result.timestamp).toBe("string")
    expect(queryRaw).toHaveBeenCalledTimes(1)
  })

  it("throws ServiceUnavailableException when the database is unreachable", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"))

    let caught: unknown
    try {
      await controller.check()
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException)
    const body = (caught as ServiceUnavailableException).getResponse() as {
      status: string
      database: string
      timestamp: string
    }
    expect(body).toMatchObject({ status: "error", database: "down" })
    expect(typeof body.timestamp).toBe("string")
  })
})
