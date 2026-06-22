import path from "node:path"

import { defineConfig } from "prisma/config"

/**
 * * Prisma 7 configuration.
 * * The connection URL lives here (and is read by Prisma CLI commands such as
 * * `migrate` / `db push` / `introspect`) because the datasource `url` property
 * * is no longer allowed inside schema.prisma. At runtime the application opens
 * * its own connection through the pg driver adapter (see prisma.service.ts).
 *
 * * `process.env` is read directly (instead of Prisma's `env()` helper) so that
 * * commands which do not need a database — e.g. `prisma generate` — do not fail
 * * when the variable is absent. The npm scripts inject it via `env-cmd`.
 */
export default defineConfig({
    schema: path.join("prisma", "schema.prisma"),
    datasource: {
        url: process.env.DATABASE_CONNECTION_URL,
    },
})
