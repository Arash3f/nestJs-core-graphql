import type { INestApplication } from "@nestjs/common"
import { EnvConfigService } from "@src/modules/config/env-config.service"

import { createE2eApp } from "./helpers/e2e-app"

describe("Health", () => {
  let app: INestApplication
  let apiConfig: EnvConfigService

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    apiConfig = ctx.apiConfig
  })

  afterAll(async () => {
    await app.close()
  })

  it("+ returns ok status without authentication", async () => {
    const response = await fetch(`http://${apiConfig.serverAddress}:${apiConfig.serverPort}/health`)
    const data = (await response.json()) as {
      status: string
      database: string
      timestamp: string
    }

    expect(response.status).toBe(200)
    expect(data).toMatchObject({ status: "ok", database: "ok" })
    expect(typeof data.timestamp).toBe("string")
  })
})
