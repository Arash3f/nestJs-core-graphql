/**
 * * This Type used for get user object from enviroment
 */
export type ConfigUserType = {
    name: string
    username: string
    password: string
}

/**
 * * This Type used for get databse config object from enviroment
 */
export type ConfigDatabaseType = {
    connectionUrl: string
    name: string
    username: string
    password: string
    port: string
    host: string
}

/**
 * * This Type used for get project MODE from enviroment
 */
export enum NodeEnvType {
    Production = "production",
    Development = "development",
    Test = "test",
}
