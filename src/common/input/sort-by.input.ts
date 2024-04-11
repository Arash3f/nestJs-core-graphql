import { Field, InputType } from "@nestjs/graphql"
import { OrderByType } from "@src/common/types/common.type"
import { IsOptional } from "class-validator"

/**
 * * Data transfer object for Sort By Input
 */
@InputType()
export class SortByData {
    @Field(() => String, { nullable: true })
    @IsOptional()
    field?: string

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    descending?: boolean

    /**
     * * The internal function that prepares the final object for pagination filter, when working with prisma
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
    convertToPrismaFilter?(): OrderByType {
        const result = { orderBy: {} }
        if (this.field)
            result.orderBy[this.field] = this.descending ? "desc" : "asc"

        return result
    }
}
