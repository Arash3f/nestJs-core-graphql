import { Args, ArgsOptions } from "@nestjs/graphql"
import deepMerge from "deepmerge"

/**
 * This function is implemented for convenience in using the (Args)
 * function and activated at the project setup and applied in the
 * project schema
 * @typeParam T - It must be one of the dto class types
 * @param ClassType Object type for (data) key
 * @param args Not inportant (It is automatically filled by graphql for each API)
 * @returns new input type for graphql schema
 * ```ts
 * .@Query(() => ReadRoleOutput)
 * async readRoles(
 *              .@WhereOptionalArg(ReadRoleInput) where: ReadRoleInput,
 *              .@PaginationArg() pagination: PaginationData,
 *              .@SortByArg() sortBy: SortByData,
 * ) {
 *              return await this.roleService.readRoles({ where, pagination, sortBy })
 * }
 * ```
 */
export function WhereOptionalArg<T>(
    ClassType: T,
    args?: ArgsOptions,
): ParameterDecorator {
    const innerArgs = deepMerge(args as T, {
        type: () => ClassType,
        nullable: true,
    })
    return Args("where", innerArgs)
}

/**
 * This function is implemented for convenience in using the (Args)
 * function and activated at the project setup and applied in the
 * project schema
 * @typeParam T - It must be one of the dto class types
 * @param ClassType Object type for (data) key
 * @param args Not inportant (It is automatically filled by graphql for each API)
 * @label InputArgs
 * @returns new input type for graphql schema
 * ```ts
 * .@Query(() => ReadRoleOutput)
 * async readRoles(
 *              .@WhereRequirementArg(ReadRoleInput) where: ReadRoleInput,
 *              .@WhereRequirementArg(ReadRoleInput) where: ReadRoleInput,
 *              .@PaginationArg() pagination: PaginationData,
 *              .@SortByArg() sortBy: SortByData,
 * ) {
 *              return await this.roleService.readRoles({ where, pagination, sortBy })
 * }
 * ```
 */
export function WhereRequirementArg<T>(
    ClassType: T,
    args?: ArgsOptions,
): ParameterDecorator {
    const innerArgs = deepMerge(args as T, { type: () => ClassType })
    return Args("where", innerArgs)
}
