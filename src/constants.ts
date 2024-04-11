/**
 * This enum keeps all module names
 */
export enum ModuleNames {
    AuthModule = "AuthModule",
    ErrorModule = "ErrorModule",
    ConfigModule = "ConfigModule",
    InitModule = "InitModule",
    PrismaModule = "PrismaModule",
}

/**
 * This address is used for testing
 */
export const serverAddress = `${process.env.serverAddress}:${process.env.serverPort}`

/**
 * This address is used for creating api swagger
 */
export const serverApiDocs = `${serverAddress}/${process.env.swaggerDocsPath}`
