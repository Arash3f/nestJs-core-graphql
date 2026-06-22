import { Args, ArgsOptions } from "@nestjs/graphql"

/**
 * * Convenience wrapper around `@Args("data", ...)` that injects the GraphQL
 * * input type so resolvers can simply write `@DataArg(LoginInput) data`.
 * @typeParam T - One of the DTO class types
 * @param ClassType Object type for the `data` argument
 * @param args Optional extra `@Args` options
 */
export function DataArg<T>(
    ClassType: T,
    args?: ArgsOptions,
): ParameterDecorator {
    return Args("data", { ...args, type: () => ClassType } as ArgsOptions)
}
