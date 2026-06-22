import { execSync } from "child_process"

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
