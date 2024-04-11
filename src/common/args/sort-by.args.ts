import { Args } from "@nestjs/graphql"
import { SortByData } from "@src/common/input/sort-by.input"

/**
 * This function is implemented for convenience in using the (Args)
 * function and activated at the project setup and applied in the
 * project schema
 * @returns new input type for graphql schema
 * @example
 * In Auth module --> resolver.ts
 * ```ts
 * .@Query(() => ReadRoleOutput)
 * async readRoles(
 *		.@WhereOptionalArg(ReadRoleInput) where: ReadRoleInput,
 *		.@PaginationArg() pagination: PaginationData,
 *		.@SortByArg() sortBy: SortByData,
 *		.@GetUserId() requesterId: string,
 * ) {
 * 		return await this.roleService.readRoles({ where, pagination, sortBy }, requesterId)
 * }
 * ```
 */
export function SortByArg(): ParameterDecorator {
    return Args("sortBy", { type: () => SortByData, nullable: true })
}
