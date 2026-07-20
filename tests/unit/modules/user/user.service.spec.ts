import { Role } from "@prisma/client"
import { AppException } from "@src/app.exception"
import { PaginationData } from "@src/common/dto/pagination.input"
import { SortByData } from "@src/common/dto/sort-by.input"
import { UserErrors } from "@src/modules/user/constants/errors"
import { UserService } from "@src/modules/user/user.service"

const buildUser = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  username: "john",
  name: "John",
  active: true,
  role: Role.Member,
  createdDate: new Date(0),
  updatedDate: new Date(0),
  ...overrides,
})

describe("UserService", () => {
  let service: UserService
  let prisma: {
    users: {
      findUnique: jest.Mock
      findFirst: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
    }
    handlePrismaErrors: jest.Mock
  }
  const authService = { generatedHashedPassword: jest.fn().mockResolvedValue("hashed") }

  beforeEach(() => {
    jest.clearAllMocks()

    prisma = {
      users: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      handlePrismaErrors: jest.fn(() => {
        throw new AppException(UserErrors.UsernameIsDuplicated)
      }),
    }
    authService.generatedHashedPassword.mockResolvedValue("hashed")

    service = new UserService(prisma as never, authService as never)
  })

  describe("me", () => {
    it("returns the requester's profile without the password hash", async () => {
      const user = buildUser()
      prisma.users.findUnique.mockResolvedValue(user)

      await expect(service.me("user-1")).resolves.toBe(user)
      expect(prisma.users.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          select: expect.objectContaining({ passwordHash: false }),
        }),
      )
    })

    it("throws UserNotFound when the requester no longer exists", async () => {
      prisma.users.findUnique.mockResolvedValue(null)

      await expect(service.me("ghost")).rejects.toThrow(UserErrors.UserNotFound.message)
    })
  })

  describe("createUser", () => {
    it("hashes the password and creates a user with a lowercased username", async () => {
      const created = buildUser({ role: Role.Admin })
      prisma.users.create.mockResolvedValue(created)

      const result = await service.createUser({
        name: "John",
        username: "John",
        password: "pw",
        role: Role.Admin,
      })

      expect(authService.generatedHashedPassword).toHaveBeenCalledWith("pw")
      expect(prisma.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: "john",
            passwordHash: "hashed",
            role: Role.Admin,
          }),
        }),
      )
      expect(result).toBe(created)
    })

    it("maps a duplicate username to UsernameIsDuplicated", async () => {
      prisma.users.create.mockRejectedValue(new Error("unique"))

      await expect(
        service.createUser({ name: "J", username: "john", password: "pw", role: Role.Member }),
      ).rejects.toThrow(UserErrors.UsernameIsDuplicated.message)
    })
  })

  describe("readUsers", () => {
    it("returns the count and the matching page of users", async () => {
      const rows = [buildUser()]
      prisma.users.count.mockResolvedValue(1)
      prisma.users.findMany.mockResolvedValue(rows)

      const result = await service.readUsers({
        where: { username: "jo", role: Role.Member },
      })

      expect(result).toEqual({ count: 1, data: rows })
      expect(prisma.users.count).toHaveBeenCalledTimes(1)
      expect(prisma.users.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.Member,
            username: { mode: "insensitive", contains: "jo" },
          }),
        }),
      )
    })

    it("applies sort and pagination fragments when provided", async () => {
      prisma.users.count.mockResolvedValue(0)
      prisma.users.findMany.mockResolvedValue([])

      const pagination = Object.assign(new PaginationData(), { take: 5, skip: 10 })
      const sortBy = Object.assign(new SortByData(), { field: "name", descending: false })

      await service.readUsers({ pagination, sortBy })

      expect(prisma.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: "asc" }, skip: 10, take: 5 }),
      )
    })
  })

  describe("updateUser", () => {
    it("updates the user and lowercases the username", async () => {
      const updated = buildUser({ username: "jane" })
      prisma.users.update.mockResolvedValue(updated)

      const result = await service.updateUser({
        where: { id: "user-1" },
        data: { username: "Jane", name: "Jane" },
      })

      expect(result).toBe(updated)
      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ username: "jane", name: "Jane" }),
        }),
      )
    })

    it("maps a missing user to UserNotFound", async () => {
      prisma.users.update.mockRejectedValue(new Error("not found"))
      prisma.handlePrismaErrors.mockImplementation(() => {
        throw new AppException(UserErrors.UserNotFound)
      })

      await expect(
        service.updateUser({ where: { id: "ghost" }, data: { name: "x" } }),
      ).rejects.toThrow(UserErrors.UserNotFound.message)
    })
  })

  describe("updateMe", () => {
    it("updates only name and username for the requester", async () => {
      const updated = buildUser()
      prisma.users.update.mockResolvedValue(updated)

      await service.updateMe("user-1", { name: "New", username: "New" })

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: { name: "New", username: "new" },
        }),
      )
    })
  })

  describe("deleteUser", () => {
    it("soft-deletes by setting active to false", async () => {
      prisma.users.update.mockResolvedValue(buildUser({ active: false }))

      const result = await service.deleteUser({ id: "user-1" })

      expect(result).toEqual({ success: true })
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { active: false, refreshTokenHash: null },
      })
    })

    it("maps a missing user to UserNotFound", async () => {
      prisma.users.update.mockRejectedValue(new Error("not found"))
      prisma.handlePrismaErrors.mockImplementation(() => {
        throw new AppException(UserErrors.UserNotFound)
      })

      await expect(service.deleteUser({ id: "ghost" })).rejects.toThrow(
        UserErrors.UserNotFound.message,
      )
    })
  })

  describe("verifyDuplicateUsernameWithException", () => {
    it("returns true when no other user holds the username", async () => {
      prisma.users.findFirst.mockResolvedValue(null)

      await expect(service.verifyDuplicateUsernameWithException("john")).resolves.toBe(true)
    })

    it("throws UsernameIsDuplicated when the username is taken", async () => {
      prisma.users.findFirst.mockResolvedValue(buildUser())

      await expect(service.verifyDuplicateUsernameWithException("john")).rejects.toThrow(
        UserErrors.UsernameIsDuplicated.message,
      )
    })
  })

  describe("verifyUserExistenceByUserId", () => {
    it("returns the user when found", async () => {
      const user = buildUser()
      prisma.users.findUnique.mockResolvedValue(user)

      await expect(service.verifyUserExistenceByUserId("user-1")).resolves.toBe(user)
    })

    it("throws UserNotFound when the user does not exist", async () => {
      prisma.users.findUnique.mockResolvedValue(null)

      await expect(service.verifyUserExistenceByUserId("ghost")).rejects.toThrow(
        UserErrors.UserNotFound.message,
      )
    })
  })
})
