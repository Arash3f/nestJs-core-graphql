import { Prisma } from "@prisma/client"
import { AppException } from "@src/app.exception"
import type { SortByData } from "@src/common/dto/sort-by.input"
import { PrismaErrors } from "@src/modules/prisma/constants/errors"

/**
 * Lazily-built cache of sortable (non-relation) field names per model.
 * Derived from Prisma's DMMF so it always tracks the current schema — no manual lists.
 */
const sortableFieldsByModel = new Map<Prisma.ModelName, ReadonlySet<string>>()

/**
 * Returns the scalar/enum field names usable in an `orderBy` for the given model.
 * Relation (`object`) fields are excluded — the simple `{ field: "asc" | "desc" }`
 * shape is only valid for scalar/enum columns.
 * @param model the Prisma model name (e.g. `"Faq"`)
 */
function getSortableFields(model: Prisma.ModelName): ReadonlySet<string> {
  const cached = sortableFieldsByModel.get(model)
  if (cached) return cached

  const meta = Prisma.dmmf.datamodel.models.find((entry) => entry.name === model)
  const fields = new Set(
    meta?.fields.filter((field) => field.kind !== "object").map((field) => field.name) ?? [],
  )

  sortableFieldsByModel.set(model, fields)
  return fields
}

/**
 * Prepares the Prisma `orderBy` fragment from a sort-by payload.
 *
 * When `model` is provided, `field` is validated against that model's real columns,
 * so an unknown field raises a `400` ({@link PrismaErrors.InvalidSortField}) instead of
 * letting Prisma throw a `PrismaClientValidationError` (which surfaces as a `500`).
 *
 * @param input the incoming sort-by payload
 * @param model the Prisma model being queried; pass it to enable field validation
 * @returns a Prisma `orderBy` fragment (or `{}` when no field is requested)
 * @example
 * In User module --> service.ts
 * ```ts
 * const entity = this.prisma.users.findMany({
 * 		where: whereClause,
 * 		...convertSortByToPrismaFilter(input?.sortBy, Prisma.ModelName.Users),
 * 		...convertPaginationToPrismaFilter(input?.pagination)
 * })
 * ```
 */
export function convertSortByToPrismaFilter(
  input: SortByData | undefined,
  model?: Prisma.ModelName,
) {
  if (!input?.field) return {}

  if (model && !getSortableFields(model).has(input.field)) {
    throw new AppException({
      ...PrismaErrors.InvalidSortField,
      developerMessage: `"${input.field}" is not a sortable field on ${model}`,
    })
  }

  const result: { orderBy: Record<string, "asc" | "desc"> } = { orderBy: {} }
  result.orderBy[input.field] = input.descending ? "desc" : "asc"

  return result
}
