import { Prisma } from "@prisma/client"
import { AppException } from "@src/app.exception"
import type { SortByData } from "@src/common/dto/sort-by.input"
import { PrismaErrors } from "@src/modules/prisma/constants/errors"
import { convertSortByToPrismaFilter } from "@src/modules/prisma/utils/sort-by.convert"

const sortBy = (data: Partial<SortByData>): SortByData => data as SortByData

describe("convertSortByToPrismaFilter", () => {
  it("returns an empty object when no field is provided", () => {
    expect(convertSortByToPrismaFilter(undefined)).toEqual({})
    expect(convertSortByToPrismaFilter(sortBy({ descending: true }))).toEqual({})
  })

  it("builds a descending orderBy by default", () => {
    expect(convertSortByToPrismaFilter(sortBy({ field: "name", descending: true }))).toEqual({
      orderBy: { name: "desc" },
    })
  })

  it("builds an ascending orderBy when descending is false", () => {
    expect(convertSortByToPrismaFilter(sortBy({ field: "name", descending: false }))).toEqual({
      orderBy: { name: "asc" },
    })
  })

  it("skips field validation when no model is provided", () => {
    expect(
      convertSortByToPrismaFilter(sortBy({ field: "notARealField", descending: true })),
    ).toEqual({
      orderBy: { notARealField: "desc" },
    })
  })

  it("accepts a real scalar field on the given model", () => {
    expect(
      convertSortByToPrismaFilter(
        sortBy({ field: "username", descending: false }),
        Prisma.ModelName.Users,
      ),
    ).toEqual({ orderBy: { username: "asc" } })
  })

  it("throws PrismaErrors.InvalidSortField for an unknown field on the given model", () => {
    expect(() =>
      convertSortByToPrismaFilter(
        sortBy({ field: "notARealField", descending: true }),
        Prisma.ModelName.Users,
      ),
    ).toThrow(expect.objectContaining(PrismaErrors.InvalidSortField))
  })

  it("throws an AppException instance for an unknown field", () => {
    expect(() =>
      convertSortByToPrismaFilter(
        sortBy({ field: "notARealField", descending: true }),
        Prisma.ModelName.Users,
      ),
    ).toThrow(AppException)
  })

  it("caches the sortable fields for a model across calls", () => {
    convertSortByToPrismaFilter(
      sortBy({ field: "username", descending: true }),
      Prisma.ModelName.Users,
    )
    expect(
      convertSortByToPrismaFilter(
        sortBy({ field: "role", descending: true }),
        Prisma.ModelName.Users,
      ),
    ).toEqual({ orderBy: { role: "desc" } })
  })
})
