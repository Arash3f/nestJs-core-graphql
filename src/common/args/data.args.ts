import { Args, ArgsOptions } from "@nestjs/graphql"
import deepmerge from "deepmerge"

export function DataArg<T>(
    ClassType: T,
    args?: ArgsOptions,
): ParameterDecorator {
    const innerArgs = deepmerge(args as T, { type: () => ClassType })
    return Args("data", innerArgs)
}
