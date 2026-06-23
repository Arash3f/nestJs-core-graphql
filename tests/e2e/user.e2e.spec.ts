import type { INestApplication } from "@nestjs/common"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { UserErrors } from "@src/modules/user/constants/errors"
import {
  extractGraphqlError,
  SUCCESS_SELECTION,
  TestApiCaller,
  USER_SELECTION,
} from "@src/utils/test-utils"

import { createE2eApp } from "./helpers/e2e-app"

/**
 * Local stand-in for the Jest global `fail`, which jest-circus (the default
 * runner) no longer exposes. Throwing keeps the "should have rejected" intent.
 */
const fail = (message: string): never => {
  throw new Error(message)
}

/** `readUsers` returns a `{ count, data }` envelope; select both every time. */
const READ_USERS_SELECTION = { count: true, data: USER_SELECTION } as const

describe("User", () => {
  const api = new TestApiCaller()
  let app: INestApplication
  let prisma: PrismaService
  let apiConfig: EnvConfigService

  /**
   * * FakeId used for not-found / empty-filter tests (valid UUID shape)
   */
  const FAKEID = "98a753df-bf91-45f0-914f-35acd9966ad5"

  /** The admin (`Role.Admin`) fixture username, from the validated env config. */
  let adminUsername: string
  /** The member (`Role.Member`) fixture username, from the validated env config. */
  let memberUsername: string

  const mockUser = {
    name: "John Doe",
    username: "John.Doe",
    password: "Sup3rS3cret!",
    role: "Member",
  } as const

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    apiConfig = ctx.apiConfig

    api.setApiConfig(apiConfig)
    api.setPrismaClient(prisma)

    adminUsername = apiConfig.defaultSuperUser.username.toLowerCase()
    memberUsername = apiConfig.defaultMemberUser.username.toLowerCase()
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
   * ! | Me                | !
   * ! ------------------- !
   */
  describe("Me", () => {
    it("+ returns the authenticated admin user", async () => {
      const { me } = await api.query({ me: USER_SELECTION })

      expect(me.id).toBeDefined()
      expect(me.username).toBe(adminUsername)
      expect(me.role).toBe("Admin")
      expect(me.active).toBe(true)
      expect(typeof me.createdDate).toBe("string")
      expect(typeof me.updatedDate).toBe("string")
    })

    it("+ returns the authenticated member user", async () => {
      await api.setMemberMode()

      const { me } = await api.query({ me: USER_SELECTION })

      expect(me.username).toBe(memberUsername)
      expect(me.role).toBe("Member")
    })

    it("- UserIsNotAuthorized for an anonymous request", async () => {
      api.setAnonymousMode()

      try {
        await api.query({ me: USER_SELECTION })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | UpdateMe          | !
   * ! ------------------- !
   */
  describe("UpdateMe", () => {
    it("+ lets a member change their own name and username", async () => {
      await api.setMemberMode()

      const { updateMe } = await api.mutation({
        updateMe: [{ data: { name: "Renamed", username: "Renamed.Member" } }, USER_SELECTION],
      })

      expect(updateMe.name).toBe("Renamed")
      // username is stored lower-cased
      expect(updateMe.username).toBe("renamed.member")
      // role/active are untouched (not editable through updateMe)
      expect(updateMe.role).toBe("Member")
      expect(updateMe.active).toBe(true)
    })

    it("- UsernameIsDuplicated when taking another user's username", async () => {
      await api.setMemberMode()

      try {
        await api.mutation({ updateMe: [{ data: { username: adminUsername } }, USER_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UsernameIsDuplicated)
      }
    })

    it("- UserIsNotAuthorized for an anonymous request", async () => {
      api.setAnonymousMode()

      try {
        await api.mutation({ updateMe: [{ data: { name: "x" } }, USER_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | CreateUser        | !
   * ! ------------------- !
   */
  describe("CreateUser", () => {
    it("+ creates a user and persists it (username lower-cased)", async () => {
      const { createUser } = await api.mutation({
        createUser: [{ data: mockUser }, USER_SELECTION],
      })

      expect(createUser.id).toBeDefined()
      expect(createUser.name).toBe(mockUser.name)
      expect(createUser.username).toBe(mockUser.username.toLowerCase())
      expect(createUser.role).toBe("Member")
      expect(createUser.active).toBe(true)

      const persisted = await prisma.users.findUniqueOrThrow({ where: { id: createUser.id } })
      expect(persisted.username).toBe(mockUser.username.toLowerCase())
    })

    it("+ can create an Admin", async () => {
      const { createUser } = await api.mutation({
        createUser: [
          { data: { ...mockUser, username: "second.admin", role: "Admin" } },
          USER_SELECTION,
        ],
      })

      expect(createUser.role).toBe("Admin")
    })

    it("- UsernameIsDuplicated for an existing username", async () => {
      try {
        await api.mutation({
          createUser: [{ data: { ...mockUser, username: memberUsername } }, USER_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UsernameIsDuplicated)
      }
    })

    it("- UserIsNotAuthorized for an anonymous request", async () => {
      api.setAnonymousMode()

      try {
        await api.mutation({ createUser: [{ data: mockUser }, USER_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })

    it("- AccessDenied for a non-admin member", async () => {
      await api.setMemberMode()

      try {
        await api.mutation({ createUser: [{ data: mockUser }, USER_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.AccessDenied)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | ReadUsers         | !
   * ! ------------------- !
   */
  describe("ReadUsers", () => {
    it("+ returns the two seeded users with no filter", async () => {
      const { readUsers } = await api.query({ readUsers: [{}, READ_USERS_SELECTION] })

      expect(readUsers.count).toBe(2)
      expect(readUsers.data.length).toBe(2)
    })

    it("+ is readable by a non-admin member", async () => {
      await api.setMemberMode()

      const { readUsers } = await api.query({ readUsers: [{}, READ_USERS_SELECTION] })
      expect(readUsers.count).toBe(2)
    })

    it("+ filters by username (case-insensitive contains)", async () => {
      const { readUsers } = await api.query({
        readUsers: [{ where: { username: adminUsername.toUpperCase() } }, READ_USERS_SELECTION],
      })

      expect(readUsers.count).toBe(1)
      expect(readUsers.data[0].username).toBe(adminUsername)
    })

    it("+ filters by role", async () => {
      const { readUsers } = await api.query({
        readUsers: [{ where: { role: "Admin" } }, READ_USERS_SELECTION],
      })

      expect(readUsers.count).toBe(1)
      expect(readUsers.data[0].role).toBe("Admin")
    })

    it("+ filters by the active flag", async () => {
      await prisma.users.update({
        where: { username: memberUsername },
        data: { active: false },
      })

      const { readUsers: actives } = await api.query({
        readUsers: [{ where: { active: true } }, READ_USERS_SELECTION],
      })
      expect(actives.count).toBe(1)
      expect(actives.data[0].username).toBe(adminUsername)

      const { readUsers: inactives } = await api.query({
        readUsers: [{ where: { active: false } }, READ_USERS_SELECTION],
      })
      expect(inactives.count).toBe(1)
      expect(inactives.data[0].username).toBe(memberUsername)
    })

    it("+ paginates results", async () => {
      const { readUsers: page1 } = await api.query({
        readUsers: [{ pagination: { take: 1, skip: 0 } }, READ_USERS_SELECTION],
      })
      expect(page1.count).toBe(2)
      expect(page1.data.length).toBe(1)

      const { readUsers: page2 } = await api.query({
        readUsers: [{ pagination: { take: 1, skip: 1 } }, READ_USERS_SELECTION],
      })
      expect(page2.data.length).toBe(1)
      expect(page2.data[0].id).not.toBe(page1.data[0].id)
    })

    it("+ sorts by username ascending and descending", async () => {
      const { readUsers: asc } = await api.query({
        readUsers: [{ sortBy: { field: "username", descending: false } }, READ_USERS_SELECTION],
      })
      const ascNames = asc.data.map((u) => u.username)
      expect(ascNames).toEqual([...ascNames].sort())

      const { readUsers: desc } = await api.query({
        readUsers: [{ sortBy: { field: "username", descending: true } }, READ_USERS_SELECTION],
      })
      const descNames = desc.data.map((u) => u.username)
      expect(descNames).toEqual([...ascNames].reverse())
    })

    it("+ empty result for an unknown filter", async () => {
      const { readUsers } = await api.query({
        readUsers: [{ where: { id: FAKEID } }, READ_USERS_SELECTION],
      })
      expect(readUsers.count).toBe(0)
      expect(readUsers.data).toHaveLength(0)
    })

    it("- UserIsNotAuthorized for an anonymous request", async () => {
      api.setAnonymousMode()

      try {
        await api.query({ readUsers: [{}, READ_USERS_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.UserIsNotAuthorized)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | UpdateUser        | !
   * ! ------------------- !
   */
  describe("UpdateUser", () => {
    it("+ updates fields (name, active, role, username lower-cased)", async () => {
      const { createUser: created } = await api.mutation({
        createUser: [{ data: mockUser }, USER_SELECTION],
      })

      const { updateUser: updated } = await api.mutation({
        updateUser: [
          {
            data: { name: "Jane Roe", active: false, role: "Admin", username: "Jane.Roe" },
            where: { id: created.id },
          },
          USER_SELECTION,
        ],
      })

      expect(updated.id).toBe(created.id)
      expect(updated.name).toBe("Jane Roe")
      expect(updated.active).toBe(false)
      expect(updated.role).toBe("Admin")
      expect(updated.username).toBe("jane.roe")
    })

    it("- UserNotFound for an unknown id", async () => {
      try {
        await api.mutation({
          updateUser: [{ data: { name: "x" }, where: { id: FAKEID } }, USER_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UserNotFound)
      }
    })

    it("- UsernameIsDuplicated when colliding with another user", async () => {
      const member = await prisma.users.findUniqueOrThrow({
        where: { username: memberUsername },
      })

      try {
        await api.mutation({
          updateUser: [
            { data: { username: adminUsername }, where: { id: member.id } },
            USER_SELECTION,
          ],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UsernameIsDuplicated)
      }
    })

    it("- AccessDenied for a non-admin member", async () => {
      const { createUser: created } = await api.mutation({
        createUser: [{ data: mockUser }, USER_SELECTION],
      })
      await api.setMemberMode()

      try {
        await api.mutation({
          updateUser: [{ data: { name: "x" }, where: { id: created.id } }, USER_SELECTION],
        })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.AccessDenied)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | DeleteUser        | !
   * ! ------------------- !
   */
  describe("DeleteUser", () => {
    it("+ soft-deletes a user (sets active to false)", async () => {
      const { createUser: created } = await api.mutation({
        createUser: [{ data: mockUser }, USER_SELECTION],
      })

      const { deleteUser } = await api.mutation({
        deleteUser: [{ where: { id: created.id } }, SUCCESS_SELECTION],
      })
      expect(deleteUser.success).toBe(true)

      const persisted = await prisma.users.findUniqueOrThrow({ where: { id: created.id } })
      expect(persisted.active).toBe(false)
    })

    it("- UserNotFound for an unknown id", async () => {
      try {
        await api.mutation({ deleteUser: [{ where: { id: FAKEID } }, SUCCESS_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(UserErrors.UserNotFound)
      }
    })

    it("- AccessDenied for a non-admin member", async () => {
      const { createUser: created } = await api.mutation({
        createUser: [{ data: mockUser }, USER_SELECTION],
      })
      await api.setMemberMode()

      try {
        await api.mutation({ deleteUser: [{ where: { id: created.id } }, SUCCESS_SELECTION] })
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject(AuthErrors.AccessDenied)
      }
    })
  })

  /**
   * ! ------------------- !
   * ! | Validation        | !
   * ! ------------------- !
   *
   * See the note in `auth.e2e.spec.ts`: GraphQL rejects missing/unknown fields
   * at the schema layer ({@link expectInputRejected}), while value-level rule
   * violations reach the Nest `ValidationPipe` and surface the normalized
   * `9999` body ({@link expectPipeValidationError}). Malformed inputs are cast to
   * `never` so the typed Zeus client accepts them.
   */
  describe("Validation", () => {
    const expectInputRejected = async (request: () => Promise<unknown>) => {
      try {
        await request()
        fail("Test failed!")
      } catch (err) {
        const body = extractGraphqlError(err)
        expect(body?.message).toBeTruthy()
      }
    }

    const expectPipeValidationError = async (request: () => Promise<unknown>) => {
      try {
        await request()
        fail("Test failed!")
      } catch (err) {
        expect(extractGraphqlError(err)).toMatchObject({
          statusCode: 400,
          code: 9999,
          module: "ErrorModule",
        })
      }
    }

    it("- rejects CreateUser missing the role", async () => {
      await expectInputRejected(() =>
        api.mutation({
          createUser: [
            { data: { name: "x", username: "x.user", password: "y" } as never },
            USER_SELECTION,
          ],
        }),
      )
    })

    it("- rejects CreateUser carrying an unknown field (whitelist)", async () => {
      await expectInputRejected(() =>
        api.mutation({
          createUser: [{ data: { ...mockUser, extra: true } as never }, USER_SELECTION],
        }),
      )
    })

    it("- 400 for a non-uuid id filter on ReadUsers", async () => {
      await expectPipeValidationError(() =>
        api.query({ readUsers: [{ where: { id: "not-a-uuid" } }, READ_USERS_SELECTION] }),
      )
    })

    it("- rejects an unknown filter field on ReadUsers (whitelist)", async () => {
      await expectInputRejected(() =>
        api.query({ readUsers: [{ where: { foo: "bar" } as never }, READ_USERS_SELECTION] }),
      )
    })

    it("- 400 when ReadUsers pagination take exceeds the maximum", async () => {
      await expectPipeValidationError(() =>
        api.query({ readUsers: [{ pagination: { take: 999 } }, READ_USERS_SELECTION] }),
      )
    })

    it("- 400 when UpdateUser targets a non-uuid id", async () => {
      await expectPipeValidationError(() =>
        api.mutation({
          updateUser: [{ data: { name: "x" }, where: { id: "not-a-uuid" } }, USER_SELECTION],
        }),
      )
    })
  })
})
