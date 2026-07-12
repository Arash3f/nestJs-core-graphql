import type { INestApplication } from "@nestjs/common"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { UserErrors } from "@src/modules/user/constants/errors"
import { createE2eApp } from "./helpers/e2e-app"
import {
  extractGraphqlError,
  SUCCESS_SELECTION,
  TestApiCaller,
  TOKENS_SELECTION,
} from "./helpers/test-utils"

/**
 * Local stand-in for the Jest global `fail`, which jest-circus (the default
 * runner) no longer exposes. Throwing keeps the "should have rejected" intent.
 */
const fail = (message: string): never => {
  throw new Error(message)
}

describe("Auth", () => {
  const api = new TestApiCaller()
  let app: INestApplication
  let prisma: PrismaService
  let apiConfig: EnvConfigService

  /**
   * * FakeId used for not-found tests (valid UUID shape, never seeded)
   */
  const FAKEID = "98a753df-bf91-45f0-914f-35acd9966ad5"

  /** The admin (`Role.Admin`) fixture credentials, from the validated env config. */
  let admin: { username: string; password: string }
  /** The member (`Role.Member`) fixture credentials, from the validated env config. */
  let member: { username: string; password: string }

  /**
   * Asserts a string is shaped like a JWT (three dot-separated segments).
   *
   * @param token - The token to inspect.
   */
  const expectJwt = (token: string) => {
    expect(typeof token).toBe("string")
    expect(token.split(".")).toHaveLength(3)
  }

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    apiConfig = ctx.apiConfig

    api.setApiConfig(apiConfig)
    api.setPrismaClient(prisma)

    admin = {
      username: apiConfig.defaultSuperUser.username,
      password: apiConfig.defaultSuperUser.password,
    }
    member = {
      username: apiConfig.defaultMemberUser.username,
      password: apiConfig.defaultMemberUser.password,
    }
  })

  beforeEach(async () => {
    api.setAnonymousMode()
    await api.resetDatabase()
    await api.createAdminUser()
    await api.createMemberUser()
    await api.setAdminMode()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
  })

  /**
   * ! ------------------- !
   * ! | LogIn             | !
   * ! ------------------- !
   */
  describe("LogIn", () => {
    it("+ returns an access/refresh token pair for valid credentials", async () => {
      api.setAnonymousMode()

      const { logIn } = await api.mutation({ logIn: [{ data: admin }, TOKENS_SELECTION] })

      expectJwt(logIn.accessToken)
      expectJwt(logIn.refreshToken)
    })

    it("+ is case-insensitive on the username", async () => {
      api.setAnonymousMode()

      const { logIn } = await api.mutation({
        logIn: [
          { data: { username: admin.username.toUpperCase(), password: admin.password } },
          TOKENS_SELECTION,
        ],
      })

      expectJwt(logIn.accessToken)
    })

    it("+ persists a refresh-token hash on the user", async () => {
      api.setAnonymousMode()

      await api.mutation({ logIn: [{ data: member }, TOKENS_SELECTION] })

      const row = await prisma.users.findUniqueOrThrow({
        where: { username: member.username.toLowerCase() },
      })
      expect(row.refreshTokenHash).not.toBeNull()
    })

    it("- IncorrectUsernameOrPassword for a wrong password", async () => {
      api.setAnonymousMode()

      try {
        await api.mutation({
          logIn: [
            { data: { username: admin.username, password: "definitely-wrong" } },
            TOKENS_SELECTION,
          ],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.IncorrectUsernameOrPassword)
      }
    })

    it("- IncorrectUsernameOrPassword for an unknown username", async () => {
      api.setAnonymousMode()

      try {
        await api.mutation({
          logIn: [{ data: { username: "ghost", password: "whatever" } }, TOKENS_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.IncorrectUsernameOrPassword)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | Register          | !
   * ! ------------------- !
   */
  describe("Register", () => {
    const NEW_USER = { name: "New User", username: "New.User", password: "S3cret!pass" }

    it("+ creates a Member, auto-logs in, and returns tokens", async () => {
      api.setAnonymousMode()

      const { register } = await api.mutation({ register: [{ data: NEW_USER }, TOKENS_SELECTION] })
      expectJwt(register.accessToken)
      expectJwt(register.refreshToken)

      const row = await prisma.users.findUniqueOrThrow({
        where: { username: NEW_USER.username.toLowerCase() },
      })
      // role is forced server-side, never taken from the request
      expect(row.role).toBe("Member")
      expect(row.name).toBe(NEW_USER.name)
    })

    it("+ lower-cases the username before storing", async () => {
      api.setAnonymousMode()

      await api.mutation({ register: [{ data: NEW_USER }, TOKENS_SELECTION] })

      const row = await prisma.users.findFirst({
        where: { username: NEW_USER.username.toLowerCase() },
      })
      expect(row).not.toBeNull()
    })

    it("- UsernameIsDuplicated for an existing username", async () => {
      api.setAnonymousMode()

      try {
        // the member fixture already exists
        await api.mutation({
          register: [{ data: { ...NEW_USER, username: member.username } }, TOKENS_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UsernameIsDuplicated)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | Logout            | !
   * ! ------------------- !
   */
  describe("Logout", () => {
    it("+ clears the stored refresh-token hash and returns success", async () => {
      await api.setMemberMode()

      const { logout } = await api.mutation({ logout: SUCCESS_SELECTION })
      expect(logout.success).toBe(true)

      const row = await prisma.users.findUniqueOrThrow({
        where: { username: member.username.toLowerCase() },
      })
      expect(row.refreshTokenHash).toBeNull()
    })

    it("- UserIsNotAuthorized for an anonymous request", async () => {
      api.setAnonymousMode()

      try {
        await api.mutation({ logout: SUCCESS_SELECTION })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | ChangePassword    | !
   * ! ------------------- !
   */
  describe("ChangePassword", () => {
    const NEW_PASSWORD = "Br4ndN3wP@ss"

    it("+ updates the target user's password (old fails, new works)", async () => {
      const row = await prisma.users.findUniqueOrThrow({
        where: { username: member.username.toLowerCase() },
      })

      const { changePassword } = await api.mutation({
        changePassword: [
          { data: { newPassword: NEW_PASSWORD }, where: { id: row.id } },
          SUCCESS_SELECTION,
        ],
      })
      expect(changePassword.success).toBe(true)

      // the old password no longer authenticates
      api.setAnonymousMode()
      try {
        await api.mutation({ logIn: [{ data: member }, TOKENS_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.IncorrectUsernameOrPassword)
      }

      // the new password does
      const { logIn } = await api.mutation({
        logIn: [{ data: { username: member.username, password: NEW_PASSWORD } }, TOKENS_SELECTION],
      })
      expectJwt(logIn.accessToken)
    })

    it("- UserNotFound for an unknown target id", async () => {
      try {
        await api.mutation({
          changePassword: [
            { data: { newPassword: NEW_PASSWORD }, where: { id: FAKEID } },
            SUCCESS_SELECTION,
          ],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UserNotFound)
      }
    })

    it("- UserIsNotAuthorized for an anonymous request", async () => {
      const row = await prisma.users.findUniqueOrThrow({
        where: { username: member.username.toLowerCase() },
      })
      api.setAnonymousMode()

      try {
        await api.mutation({
          changePassword: [
            { data: { newPassword: NEW_PASSWORD }, where: { id: row.id } },
            SUCCESS_SELECTION,
          ],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })

    it("- AccessDenied for a non-admin member", async () => {
      const row = await prisma.users.findUniqueOrThrow({
        where: { username: member.username.toLowerCase() },
      })
      await api.setMemberMode()

      try {
        await api.mutation({
          changePassword: [
            { data: { newPassword: NEW_PASSWORD }, where: { id: row.id } },
            SUCCESS_SELECTION,
          ],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.AccessDenied)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | RefreshToken      | !
   * ! ------------------- !
   */
  describe("RefreshToken", () => {
    /**
     * A `User-Agent` that differs from the test runner's default, used to
     * simulate a request coming from a device the session was not bound to
     * (the fingerprint is a SHA-256 of the `User-Agent`).
     */
    const OTHER_DEVICE = { headers: { "User-Agent": "OtherDevice/1.0" } }

    it("+ exchanges a valid refresh token for a fresh, usable token pair", async () => {
      api.setAnonymousMode()
      const { logIn: first } = await api.mutation({ logIn: [{ data: member }, TOKENS_SELECTION] })

      const { refreshToken: rotated } = await api.mutation({
        refreshToken: [{ data: { refreshToken: first.refreshToken } }, TOKENS_SELECTION],
      })
      expectJwt(rotated.accessToken)
      expectJwt(rotated.refreshToken)

      // the issued refresh token can itself be exchanged again
      const { refreshToken: again } = await api.mutation({
        refreshToken: [{ data: { refreshToken: rotated.refreshToken } }, TOKENS_SELECTION],
      })
      expectJwt(again.accessToken)
    })

    it("- InValidRefreshToken for a tampered token", async () => {
      api.setAnonymousMode()
      const { logIn } = await api.mutation({ logIn: [{ data: member }, TOKENS_SELECTION] })

      // keep the JWT shape (3 segments) but break the signature
      const lastChar = logIn.refreshToken.slice(-1)
      const tampered = logIn.refreshToken.slice(0, -1) + (lastChar === "a" ? "b" : "a")

      try {
        await api.mutation({
          refreshToken: [{ data: { refreshToken: tampered } }, TOKENS_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.InValidRefreshToken)
      }
    })

    it("- UserIsNotAuthorized after logout (no stored refresh token)", async () => {
      api.setAnonymousMode()
      const { logIn } = await api.mutation({ logIn: [{ data: member }, TOKENS_SELECTION] })

      // log the member out — this clears the stored refresh-token hash, so the
      // refresh token captured above can no longer be exchanged
      await api.setMemberMode()
      await api.mutation({ logout: SUCCESS_SELECTION })
      api.setAnonymousMode()

      try {
        await api.mutation({
          refreshToken: [{ data: { refreshToken: logIn.refreshToken } }, TOKENS_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })

    it("- DeviceMismatch when refreshing from a different device", async () => {
      api.setAnonymousMode()
      const { logIn } = await api.mutation({ logIn: [{ data: member }, TOKENS_SELECTION] })

      try {
        // refresh from a different device (different User-Agent → different fingerprint)
        await api.gql(OTHER_DEVICE)("mutation")({
          refreshToken: [{ data: { refreshToken: logIn.refreshToken } }, TOKENS_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.DeviceMismatch)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | Validation        | !
   * ! ------------------- !
   *
   * In GraphQL, input validation splits across two layers:
   *
   * - **Schema layer** — a missing required field or an unknown (non-whitelisted)
   *   field is rejected by GraphQL itself, *before* the resolver and the Nest
   *   `ValidationPipe` run. These carry no normalized `9999` body, so we only
   *   assert the request is rejected ({@link expectInputRejected}).
   * - **ValidationPipe layer** — a value that is well-typed for the schema but
   *   violates a `class-validator` rule (`@IsUUID`, `@IsJWT`, `@Max`) reaches
   *   the pipe, which throws a `400` the `CoreExceptionFilter` normalizes to
   *   `code: 9999`, `module: "AppModule"` ({@link expectPipeValidationError}).
   *
   * The intentionally malformed inputs are cast to `never` so the typed Zeus
   * client accepts them; Zeus still serializes them and the server rejects them.
   */
  describe("Validation", () => {
    /**
     * Asserts a request is rejected at the GraphQL schema layer (missing or
     * unknown input field).
     *
     * @param request - A thunk performing the (expected-to-fail) request.
     */
    const expectInputRejected = async (request: () => Promise<unknown>) => {
      try {
        await request()
        fail("Test failed!")
      } catch (err) {
        const body = extractGraphqlError(err)
        expect(body?.message).toBeTruthy()
      }
    }

    /**
     * Asserts a request is rejected by the Nest `ValidationPipe`: a `400`
     * normalized to the filter defaults (`code: 9999`, `module: "AppModule"`).
     *
     * @param request - A thunk performing the (expected-to-fail) request.
     */
    const expectPipeValidationError = async (request: () => Promise<unknown>) => {
      try {
        await request()
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject({
          statusCode: 400,
          code: 9999,
          module: "AppModule",
        })
      }
    }

    it("- rejects LogIn missing the password", async () => {
      api.setAnonymousMode()
      await expectInputRejected(() =>
        api.mutation({
          logIn: [{ data: { username: admin.username } as never }, TOKENS_SELECTION],
        }),
      )
    })

    it("- rejects LogIn carrying an unknown field (whitelist)", async () => {
      api.setAnonymousMode()
      await expectInputRejected(() =>
        api.mutation({ logIn: [{ data: { ...admin, role: "Admin" } as never }, TOKENS_SELECTION] }),
      )
    })

    it("- rejects Register missing the username", async () => {
      api.setAnonymousMode()
      await expectInputRejected(() =>
        api.mutation({
          register: [{ data: { name: "x", password: "y" } as never }, TOKENS_SELECTION],
        }),
      )
    })

    it("- 400 when ChangePassword targets a non-uuid id", async () => {
      await expectPipeValidationError(() =>
        api.mutation({
          changePassword: [
            { data: { newPassword: "whatever" }, where: { id: "not-a-uuid" } },
            SUCCESS_SELECTION,
          ],
        }),
      )
    })

    it("- 400 when RefreshToken is not a JWT", async () => {
      api.setAnonymousMode()
      await expectPipeValidationError(() =>
        api.mutation({ refreshToken: [{ data: { refreshToken: "notajwt" } }, TOKENS_SELECTION] }),
      )
    })
  })
})
