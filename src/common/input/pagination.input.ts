import { Field, InputType } from "@nestjs/graphql"
import { IsOptional } from "class-validator"

/**
 * * Data transfer object for Pagination Input
 */
@InputType()
export class PaginationData {
    @Field({ defaultValue: 50 })
    @IsOptional()
    take?: number

    @Field({ defaultValue: 0 })
    @IsOptional()
    skip?: number

    /**
     * * The internal function that prepares the final object for pagination filter, used when working with Prisma
     * @returns pagination object
     * @example
     * In Auth module --> service.ts
     * ```ts
     * const entity = this.prisma.users.findMany({
     * 		where: whereClause,
     * 		...input?.sortBy?.convertToPrismaFilter(),
     * 		...input?.pagination?.convertToPrismaFilter()
     * })
     * ```
     */
    convertToPrismaFilter?(): PaginationData {
        return {
            take: this.take,
            skip: this.skip,
        }
    }
}
