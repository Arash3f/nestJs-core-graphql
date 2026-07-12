import type { ArgumentsHost } from "@nestjs/common"
import { BadRequestException, HttpStatus, Logger, NotFoundException } from "@nestjs/common"
import { AppException } from "@src/app.exception"
import { ModuleNames } from "@src/common/constants"
import { CoreExceptionFilter } from "@src/common/filters/core-exception.filter"
import { EnvType } from "@src/modules/config/types/config.type"
import { UserErrors } from "@src/modules/user/constants/errors"
import { GraphQLError } from "graphql"

/**
 * Minimal GraphQL ArgumentsHost stub — the filter branches on `getType()`.
 */
const gqlHost = {
  getType: () => "graphql",
} as unknown as ArgumentsHost

/**
 * Runs the filter and returns the normalized error body it stows under
 * `extensions.originalError`.
 *
 * Unlike a REST filter, for GraphQL contexts `CoreExceptionFilter` never writes
 * to an HTTP response — Apollo owns the GraphQL response — so it always rethrows
 * a `GraphQLError`.
 */
const caughtBody = (filter: CoreExceptionFilter, exception: unknown) => {
  try {
    filter.catch(exception, gqlHost)
  } catch (err) {
    if (err instanceof GraphQLError) {
      return err.extensions.originalError as Record<string, unknown>
    }
    throw err
  }
  throw new Error("filter did not throw")
}

describe("CoreExceptionFilter", () => {
  // Silence the development-mode error logging so test output stays clean.
  beforeAll(() => jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined))
  afterAll(() => jest.restoreAllMocks())

  const filterFor = (nodeEnv: EnvType) => new CoreExceptionFilter({ nodeEnv } as never)

  it("maps an AppException onto its descriptor fields", () => {
    const body = caughtBody(
      filterFor(EnvType.Development),
      new AppException(UserErrors.UserNotFound),
    )

    expect(body).toMatchObject({
      message: UserErrors.UserNotFound.message,
      persianTranslation: UserErrors.UserNotFound.persianTranslation,
      code: UserErrors.UserNotFound.code,
      module: UserErrors.UserNotFound.module,
      statusCode: UserErrors.UserNotFound.statusCode,
    })
  })

  it("joins array messages from a validation HttpException", () => {
    const body = caughtBody(
      filterFor(EnvType.Development),
      new BadRequestException(["a is invalid", "b is required"]),
    )

    expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST)
    expect(body.message).toBe("a is invalid, b is required")
  })

  it("uses the status of a standard HttpException", () => {
    const body = caughtBody(filterFor(EnvType.Development), new NotFoundException("missing"))

    expect(body.statusCode).toBe(HttpStatus.NOT_FOUND)
    expect(body.message).toBe("missing")
  })

  it("treats a generic Error as a 500 and captures debug info", () => {
    const body = caughtBody(filterFor(EnvType.Development), new Error("boom"))

    expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe("boom")
    expect(body.debugError).toMatchObject({ name: "Error", message: "boom" })
  })

  it("handles a thrown string", () => {
    const body = caughtBody(filterFor(EnvType.Development), "raw failure")

    expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe("raw failure")
  })

  it("falls back to a generic 500 for unknown exception types", () => {
    const body = caughtBody(filterFor(EnvType.Development), 42)

    expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe("Internal server error")
    expect(body.module).toBe(ModuleNames.AppModule)
  })

  it("strips developerMessage and debugError in production", () => {
    const body = caughtBody(
      filterFor(EnvType.Production),
      new AppException({ ...UserErrors.UserNotFound, developerMessage: "secret detail" }),
    )

    expect(body.developerMessage).toBeUndefined()
    expect(body.debugError).toBeUndefined()
  })

  it("replaces unhandled messages with a generic string in production", () => {
    const body = caughtBody(filterFor(EnvType.Production), new Error("secret boom"))

    expect(body.message).toBe("Internal server error")
  })
})
