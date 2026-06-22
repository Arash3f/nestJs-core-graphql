import { Field, InputType } from "@nestjs/graphql"
import { Prisma } from "@prisma/client"
import { convertSortByToPrismaFilter } from "@src/modules/prisma/utils/sort-by.convert"
import { IsBoolean, IsOptional, IsString } from "class-validator"

/**
 * Data transfer object for Sort By Input
 */
@InputType()
export class SortByData {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  field?: string

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  descending = true

  /**
   * The internal function that prepares the final object for the sort filter, when working with prisma.
   *
   * Pass `model` to validate the requested `field` against that model's real columns — an unknown
   * field raises a `400` instead of letting Prisma throw a `PrismaClientValidationError` (a `500`).
   * @param model the Prisma model being queried; pass it to enable field validation
   * @returns a Prisma `orderBy` fragment (or `{}` when no field is requested)
   * @throws {AppException} PrismaErrors.InvalidSortField - When `model` is provided and `field` is not a real column on that model
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
  convertToPrismaFilter(model?: Prisma.ModelName) {
    return convertSortByToPrismaFilter(this, model)
  }
}
