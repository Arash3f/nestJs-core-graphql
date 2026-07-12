import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Role } from "@prisma/client"
import { EnvConfigModel } from "@src/modules/config/model/env-config.model"
import type { EnvType } from "@src/modules/config/types/config.type"
import { CreateUserInput } from "@src/modules/user/dto/create-user.input"

@Injectable()
export class EnvConfigService {
  constructor(private configService: ConfigService<EnvConfigModel>) {}

  get DATABASE_CONNECTION_URL(): string {
    return this.configService.getOrThrow("DATABASE_CONNECTION_URL")
  }

  /**
   * Comma-separated list of allowed CORS origins. Use `*` to allow all origins.
   */
  get corsOrigins(): string[] {
    const raw: string = this.configService.getOrThrow("CORS_ORIGINS")
    return raw
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  }

  get throttleTtlMs(): number {
    return this.configService.getOrThrow("THROTTLE_TTL_MS")
  }

  get throttleLimit(): number {
    return this.configService.getOrThrow("THROTTLE_LIMIT")
  }

  get serverPort(): number {
    return this.configService.getOrThrow("SERVER_PORT")
  }

  get jwtSecret(): string {
    return this.configService.getOrThrow("JWT_SECRET")
  }

  get jwtAccessExpire(): number {
    return this.configService.getOrThrow("JWT_ACCESS_EXPIRE")
  }

  get jwtRefreshExpire(): number {
    return this.configService.getOrThrow("JWT_REFRESH_EXPIRE")
  }

  get serverAddress(): string {
    return this.configService.getOrThrow("SERVER_ADDRESS")
  }

  get seedOnBoot(): boolean {
    return this.configService.getOrThrow("SEED_ON_BOOT")
  }

  get memoryCost(): number {
    return this.configService.getOrThrow("PASSWORD_HASH_MEMORY_COST")
  }

  get timeCost(): number {
    return this.configService.getOrThrow("PASSWORD_HASH_TIME_COST")
  }

  get parallelism(): number {
    return this.configService.getOrThrow("PASSWORD_HASH_PARALLELISM")
  }

  get nodeEnv(): EnvType {
    const nodeEnv: EnvType = this.configService.getOrThrow("NODE_ENV")
    return nodeEnv
  }

  get defaultSuperUser(): CreateUserInput {
    const defaultUserData: CreateUserInput = {
      name: this.configService.getOrThrow("SUPER_USER_NAME"),
      username: this.configService.getOrThrow("SUPER_USER_USERNAME"),
      password: this.configService.getOrThrow("SUPER_USER_PASSWORD"),
      role: Role.Admin,
    }
    return defaultUserData
  }

  get defaultMemberUser(): CreateUserInput {
    const defaultUserData: CreateUserInput = {
      name: this.configService.getOrThrow("MEMBER_USER_NAME"),
      username: this.configService.getOrThrow("MEMBER_USER_USERNAME"),
      password: this.configService.getOrThrow("MEMBER_USER_PASSWORD"),
      role: Role.Member,
    }
    return defaultUserData
  }
}
