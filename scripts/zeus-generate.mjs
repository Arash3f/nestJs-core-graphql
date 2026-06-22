import { CLI } from "graphql-zeus/lib/CLIClass.js"

await CLI.execute({ _: ["schema.gql", "./src/utils/graphql"], node: true })
