import { Field, InputType, Int } from "@nestjs/graphql"
import { convertPaginationToPrismaFilter } from "@src/modules/prisma/utils/pagination.convert"
import { IsNumber, IsOptional, Max, Min } from "class-validator"

/**
 * Data transfer object for Pagination Input
 */
@InputType()
export class PaginationData {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @Min(0)
  @Max(200)
  @IsNumber()
  take?: number = 10

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  @IsNumber()
  skip?: number = 0

  /**
   * Prepares the final `{ take, skip }` object for a Prisma pagination filter.
   *
   * @returns a Prisma pagination fragment with the resolved `take` and `skip` values
   * @example
   * In User module --> service.ts
   * ```ts
   * const entity = this.prisma.users.findMany({
   * 		where: whereClause,
   * 		...input?.sortBy?.convertToPrismaFilter(Prisma.ModelName.Users),
   * 		...input?.pagination?.convertToPrismaFilter()
   * })
   * ```
   */
  convertToPrismaFilter() {
    return convertPaginationToPrismaFilter(this)
  }
}
