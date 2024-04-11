import { NodeEnvType } from "@src/modules/config/types/config.type"
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator"

/**
 * * Environment Class Model
 */
export class EnvConfigModel {
    @IsString()
    swaggerDocsPath: string

    @IsString()
    swaggerPath: string

    @IsNumber()
    serverPort: number

    @IsString()
    jwtSecret: string

    @IsNumber()
    jwtExpire: number

    @IsString()
    DATABASE_CONNECTION_URL: string

    @IsString()
    serverAddress: string

    @IsString()
    lokiServerAddress: string

    @IsString()
    databaseName: string

    @IsString()
    databaseUsername: string

    @IsString()
    databasePassword: string

    @IsString()
    databasePort: string

    @IsString()
    databaseHost: string

    @IsEnum(NodeEnvType)
    NODE_ENV: NodeEnvType

    @IsString()
    SUPER_USER_USERNAME: string

    @IsString()
    SUPER_USER_NAME: string

    @IsString()
    SUPER_USER_PASSWORD: string

    @IsOptional()
    @IsString()
    MEMBER_USER_USERNAME?: string

    @IsOptional()
    @IsString()
    MEMBER_USER_NAME?: string

    @IsOptional()
    @IsString()
    MEMBER_USER_PASSWORD?: string
}
