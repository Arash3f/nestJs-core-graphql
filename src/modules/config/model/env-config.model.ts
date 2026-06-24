import { ToBoolean, ToNumber } from "@src/modules/config/transforms"
import { EnvType } from "@src/modules/config/types/config.type"
import { IsBoolean, IsEnum, IsNumber, IsString } from "class-validator"

export class EnvConfigModel {
  @IsNumber()
  @ToNumber()
  SERVER_PORT: number

  @IsString()
  JWT_SECRET: string

  @IsNumber()
  @ToNumber()
  JWT_ACCESS_EXPIRE: number

  @IsNumber()
  @ToNumber()
  JWT_REFRESH_EXPIRE: number

  @IsString()
  DATABASE_CONNECTION_URL: string

  @IsString()
  SERVER_ADDRESS: string

  @IsEnum(EnvType)
  NODE_ENV: EnvType

  @IsBoolean()
  @ToBoolean()
  SEED_ON_BOOT: boolean

  @IsString()
  SUPER_USER_USERNAME: string

  @IsString()
  SUPER_USER_NAME: string

  @IsString()
  SUPER_USER_PASSWORD: string

  @IsString()
  MEMBER_USER_USERNAME: string

  @IsString()
  MEMBER_USER_NAME: string

  @IsString()
  MEMBER_USER_PASSWORD: string

  @IsNumber()
  @ToNumber()
  PASSWORD_HASH_MEMORY_COST: number

  @IsNumber()
  @ToNumber()
  PASSWORD_HASH_TIME_COST: number

  @IsNumber()
  @ToNumber()
  PASSWORD_HASH_PARALLELISM: number
}
