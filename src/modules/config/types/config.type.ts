export type ConfigUserType = {
  name: string
  username: string
  password: string
}

export type ConfigDatabaseType = {
  connectionUrl: string
  name: string
  username: string
  password: string
  port: string
  host: string
}

export enum EnvType {
  Production = "production",
  Development = "development",
  Test = "test",
}
