import { execSync } from "child_process"

/**
 * * For update zeus file, we use (npm run type) and causes this function to run
 * ? whats zeus file and why we need it see https://graphqleditor.com/docs/tools/zeus/index/
 * ! after running project, schema.gql updated automatically
 */
execSync("zeus schema.gql ./src/utils/graphql --node", { stdio: "inherit" })
