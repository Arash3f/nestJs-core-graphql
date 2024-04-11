import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Role } from "@prisma/client"
import { CreateUserInput } from "@src/modules/auth/dto/create-user.input"
import { EnvConfigModel } from "@src/modules/config/model/env-config.model"
import type {
    ConfigDatabaseType,
    NodeEnvType,
} from "@src/modules/config/types/config.type"
import { plainToInstance } from "class-transformer"
import { validateSync } from "class-validator"

@Injectable()
export class EnvConfigService {
    constructor(private configService: ConfigService) {}

    /**
     * * Get DATABASE_CONNECTION_URL variable from env file
     */
    get DATABASE_CONNECTION_URL(): string {
        return this.configService.get("DATABASE_CONNECTION_URL")
    }

    /**
     * * Get swaggerDocsPath variable from env file
     */
    get swaggerDocsPath(): string {
        return this.configService.get("swaggerDocsPath")
    }

    /**
     * * Get swaggerPath variable from env file
     */
    get swaggerPath(): string {
        return this.configService.get("swaggerPath")
    }

    /**
     * * Get serverPort variable from env file
     */
    get serverPort(): number {
        return this.configService.get("serverPort")
    }

    /**
     * * Get JwtSecret variable from env file
     */
    get jwtSecret(): string {
        return this.configService.get("jwtSecret")
    }

    /**
     * * Get jwtExpire variable from env file
     */
    get jwtExpire(): number {
        return this.configService.get("jwtExpire")
    }

    /**
     * * Get serverAddress variable from env file
     */
    get serverAddress(): string {
        return this.configService.get("serverAddress")
    }

    /**
     * * Get lokiServerAddress variable from env file
     */
    get lokiServerAddress(): string {
        return this.configService.get("lokiServerAddress")
    }

    /**
     * * Get NODE_ENV variable from env file
     */
    get nodeEnv(): NodeEnvType {
        const nodeEnv: NodeEnvType = this.configService.get("NODE_ENV")
        return nodeEnv
    }

    /**
     * * Get all Database config form env file and return it as object
     */
    get databaseConfig(): ConfigDatabaseType {
        const dbConfig: ConfigDatabaseType = {
            connectionUrl: this.configService.get("DATABASE_CONNECTION_URL"),
            name: this.configService.get("databaseName"),
            username: this.configService.get("databaseUsername"),
            password: this.configService.get("databasePassword"),
            port: this.configService.get("databasePort"),
            host: this.configService.get("databaseHost"),
        }
        return dbConfig
    }

    /**
     * * Get all default super user config form env file and return it as object
     */
    get defaultSuperUser(): CreateUserInput {
        const defaultUserData: CreateUserInput = {
            name: this.configService.get("SUPER_USER_NAME"),
            username: this.configService.get("SUPER_USER_USERNAME"),
            password: this.configService.get("SUPER_USER_PASSWORD"),
            role: Role.Admin,
        }
        return defaultUserData
    }

    /**
     * * Get all default member user config form env file and return it as object
     */
    get defaultMemberUser(): CreateUserInput {
        const defaultUserData: CreateUserInput = {
            name: this.configService.get("MEMBER_USER_NAME"),
            username: this.configService.get("MEMBER_USER_USERNAME"),
            password: this.configService.get("MEMBER_USER_PASSWORD"),
            role: Role.Member,
        }
        return defaultUserData
    }

    /**
     * * This validation use in the setup project and check all envirements with {@link EnvConfigModel}, use in app.module.ts
     * @param config
     * @returns Environment Variables
     */
    static environmentValidation(
        config: Record<string, unknown>,
    ): EnvConfigModel {
        const logger = new Logger(EnvConfigService.name)

        const validatedConfig = plainToInstance(EnvConfigModel, config, {
            enableImplicitConversion: true,
        })
        const validationErrors = validateSync(validatedConfig, {
            skipMissingProperties: false,
        })

        if (validationErrors.length > 0) {
            validationErrors.forEach((err) => {
                const errorMessage = Object.values(err.constraints)
                errorMessage.forEach((error) => logger.error(error))
            })

            process.exit(1)
        }
        return validatedConfig
    }
}
