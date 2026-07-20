import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { CreateUserInput } from "@src/modules/user/dto/create-user.input"
import * as argon2 from "argon2"

@Injectable()
export class InitService implements OnApplicationBootstrap {
  /**
   * generate logger library
   */
  private readonly logger = new Logger(InitService.name)

  /**
   * Import app services
   * @param prisma prisma service for connect to database
   */
  constructor(
    private prisma: PrismaService,
    private readonly envConf: EnvConfigService,
  ) {}

  /**
   * Seeds the default super-user and member-user on application startup.
   *
   * No-op unless `SEED_ON_BOOT` is enabled. Each user is upserted so the seed
   * is safe to run on every boot.
   */
  async onApplicationBootstrap() {
    if (this.envConf.seedOnBoot !== true) return

    try {
      this.logger.verbose("Seed Admin user started ...")
      await this.seedUser(this.envConf.defaultSuperUser)

      this.logger.verbose("Seed Member user started ...")
      await this.seedUser(this.envConf.defaultMemberUser)

      this.logger.verbose("Seed service finished :)")
    } catch (error) {
      this.logger.error("Seed service failed", error instanceof Error ? error.stack : error)
      throw error
    }
  }

  /**
   * Upserts a single user from the given config.
   *
   * @param userConfig - Name, username, password and role of the user to seed
   *
   * @returns A promise that resolves once the user has been upserted.
   */
  private async seedUser(userConfig: CreateUserInput): Promise<void> {
    const { name, username, password, role } = userConfig

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.envConf.memoryCost,
      timeCost: this.envConf.timeCost,
      parallelism: this.envConf.parallelism,
    })

    const fields = { name, username, role, active: true }
    const createFields = { ...fields, passwordHash }

    await this.prisma.users.upsert({
      where: { username },
      update: fields,
      create: createFields,
    })
  }
}
