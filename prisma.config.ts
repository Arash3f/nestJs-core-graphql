import { defineConfig, env } from "prisma/config"

export default defineConfig({
  datasource: {
    url: env("DATABASE_CONNECTION_URL"),
  },
  schema: "./prisma/schema.prisma",
})
