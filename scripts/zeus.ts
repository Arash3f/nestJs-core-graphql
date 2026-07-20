import { execSync } from "child_process"
import { readdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

/**
 * * For update zeus file, we use (npm run type) and causes this function to run
 * ? whats zeus file and why we need it see https://graphqleditor.com/docs/tools/zeus/index/
 * ! after running project, schema.gql updated automatically
 *
 * Runs through scripts/zeus-generate.mjs (calling graphql-zeus's CLI class
 * directly) instead of the `zeus` binary: graphql-zeus@7's yargs CLI binds
 * positional args to `args.path`/`args.output_path`, but CLIClass.execute
 * reads them off `args._`, so the `zeus` binary always falls back to an
 * interactive prompt and hangs in non-TTY contexts.
 */
execSync("node scripts/zeus-generate.mjs", { stdio: "inherit" })

/**
 * graphql-zeus can emit CRLF on Windows. Mixed `\r` markers break TypeScript
 * parsing inside type literals (a bare `;` appears on its own line). Normalize
 * generated sources to LF so local and CI checkouts stay identical.
 */
const outputDir = join("tests", "utils", "graphql", "zeus")
for (const name of readdirSync(outputDir)) {
  if (!name.endsWith(".ts")) continue
  const filePath = join(outputDir, name)
  const raw = readFileSync(filePath, "utf8")
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  if (normalized !== raw) {
    writeFileSync(filePath, normalized, "utf8")
  }
}
