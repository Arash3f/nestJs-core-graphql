import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { EnvType } from "@src/modules/config/types/config.type"
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
   * No-op unless `SEED_ON_BOOT` is enabled. Skipped entirely in the test
   * environment — e2e specs seed their own fixtures and reset the database per
   * test, so booting the default seed here would interfere with them.
   *
   * Seeding is create-only: an existing account (matched by username) is left
   * untouched, so a reboot never resets a manually changed role/active/name.
   * Because it seeds the built-in default credentials, a warning is logged when
   * it runs in production — leaving `SEED_ON_BOOT` on with the sample passwords
   * there is a security risk.
   */
  async onApplicationBootstrap() {
    if (this.envConf.seedOnBoot !== true) return
    if (this.envConf.nodeEnv === EnvType.Test) return

    if (this.envConf.nodeEnv === EnvType.Production) {
      this.logger.warn(
        "SEED_ON_BOOT is enabled in production — ensure the default SUPER_USER_*/MEMBER_USER_* credentials have been changed.",
      )
    }

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

    const createFields = {
      name,
      username: username.toLowerCase(),
      role,
      active: true,
      passwordHash,
    }

    // Create-only: never overwrite an existing account on reboot, so a manually
    // changed role/active/password is preserved.
    await this.prisma.users.upsert({
      where: { username: username.toLowerCase() },
      update: {},
      create: createFields,
    })
  }
}
