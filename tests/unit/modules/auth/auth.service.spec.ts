import { Role } from "@prisma/client"
import { AppException } from "@src/app.exception"
import { AuthService } from "@src/modules/auth/auth.service"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { UserErrors } from "@src/modules/user/constants/errors"
import * as argon2 from "argon2"

jest.mock("argon2", () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}))

const mockedArgon = argon2 as jest.Mocked<typeof argon2>

const buildUser = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  username: "john",
  name: "John",
  active: true,
  role: Role.Member,
  passwordHash: "stored-hash",
  refreshTokenHash: "stored-refresh-hash",
  ...overrides,
})

describe("AuthService", () => {
  let service: AuthService
  let prisma: {
    users: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
    handlePrismaErrors: jest.Mock
  }
  let jwt: { signAsync: jest.Mock; verify: jest.Mock; decode: jest.Mock }
  const envConfig = { memoryCost: 1, timeCost: 1, parallelism: 1, jwtRefreshExpire: "7d" }

  beforeEach(() => {
    jest.clearAllMocks()

    prisma = {
      users: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
      handlePrismaErrors: jest.fn(() => {
        throw new AppException(UserErrors.UsernameIsDuplicated)
      }),
    }
    jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token"),
      verify: jest.fn(),
      decode: jest.fn(),
    }

    service = new AuthService(prisma as never, envConfig as never, jwt as never)

    mockedArgon.hash.mockResolvedValue("hashed" as never)
    mockedArgon.verify.mockResolvedValue(true as never)
  })

  describe("logIn", () => {
    it("returns tokens and persists the refresh-token hash on valid credentials", async () => {
      prisma.users.findUnique.mockResolvedValue(buildUser())

      const tokens = await service.logIn({ username: "John", password: "pw" })

      expect(tokens).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" })
      expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { username: "john" } })
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { refreshTokenHash: "hashed" },
      })
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1", username: "john" }),
      )
    })

    it("throws IncorrectUsernameOrPassword when the user does not exist", async () => {
      prisma.users.findUnique.mockResolvedValue(null)

      await expect(service.logIn({ username: "ghost", password: "pw" })).rejects.toThrow(
        AuthErrors.IncorrectUsernameOrPassword.message,
      )
    })

    it("throws InactiveUser when the account has been deactivated", async () => {
      prisma.users.findUnique.mockResolvedValue(buildUser({ active: false }))

      await expect(service.logIn({ username: "john", password: "pw" })).rejects.toThrow(
        AuthErrors.InactiveUser.message,
      )
      expect(mockedArgon.verify).not.toHaveBeenCalled()
    })

    it("throws IncorrectUsernameOrPassword when the password does not match", async () => {
      prisma.users.findUnique.mockResolvedValue(buildUser())
      mockedArgon.verify.mockResolvedValue(false as never)

      await expect(service.logIn({ username: "john", password: "bad" })).rejects.toThrow(
        AuthErrors.IncorrectUsernameOrPassword.message,
      )
    })
  })

  describe("logout", () => {
    it("clears the stored refresh-token hash and returns success", async () => {
      const result = await service.logout("user-1")

      expect(result).toEqual({ success: true })
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { refreshTokenHash: null },
      })
    })
  })

  describe("register", () => {
    it("creates a Member with a lowercased username and auto-logs in", async () => {
      prisma.users.create.mockResolvedValue(buildUser())
      prisma.users.findUnique.mockResolvedValue(buildUser())

      const tokens = await service.register({ name: "John", username: "John", password: "pw" })

      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ username: "john", role: Role.Member }),
      })
      expect(tokens).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" })
    })

    it("maps a duplicate username to UsernameIsDuplicated", async () => {
      prisma.users.create.mockRejectedValue(new Error("unique constraint"))

      await expect(
        service.register({ name: "John", username: "john", password: "pw" }),
      ).rejects.toThrow(UserErrors.UsernameIsDuplicated.message)
      expect(prisma.handlePrismaErrors).toHaveBeenCalled()
    })
  })

  describe("changePassword", () => {
    it("updates the target user's password hash and returns success", async () => {
      prisma.users.update.mockResolvedValue(buildUser())

      const result = await service.changePassword({ id: "user-9" }, { newPassword: "new-pw" })

      expect(result).toEqual({ success: true })
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: "user-9" },
        data: { passwordHash: "hashed", refreshTokenHash: null },
      })
    })

    it("maps a missing target user to UserNotFound", async () => {
      prisma.users.update.mockRejectedValue(new Error("not found"))
      prisma.handlePrismaErrors.mockImplementation(() => {
        throw new AppException(UserErrors.UserNotFound)
      })

      await expect(service.changePassword({ id: "ghost" }, { newPassword: "x" })).rejects.toThrow(
        UserErrors.UserNotFound.message,
      )
    })
  })

  describe("changeMyPassword", () => {
    it("verifies the current password, updates the hash, and clears refresh access", async () => {
      prisma.users.findUnique.mockResolvedValue(buildUser())
      prisma.users.update.mockResolvedValue(buildUser())

      const result = await service.changeMyPassword("user-1", {
        currentPassword: "old-pw",
        newPassword: "new-pw",
      })

      expect(result).toEqual({ success: true })
      expect(mockedArgon.verify).toHaveBeenCalledWith("stored-hash", "old-pw")
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "hashed", refreshTokenHash: null },
      })
    })

    it("throws UserNotFound when the requester no longer exists", async () => {
      prisma.users.findUnique.mockResolvedValue(null)

      await expect(
        service.changeMyPassword("ghost", { currentPassword: "a", newPassword: "b" }),
      ).rejects.toThrow(UserErrors.UserNotFound.message)
    })

    it("throws IncorrectCurrentPassword when the current password does not match", async () => {
      prisma.users.findUnique.mockResolvedValue(buildUser())
      mockedArgon.verify.mockResolvedValue(false as never)

      await expect(
        service.changeMyPassword("user-1", { currentPassword: "wrong", newPassword: "b" }),
      ).rejects.toThrow(AuthErrors.IncorrectCurrentPassword.message)
    })
  })

  describe("refreshToken", () => {
    const input = { refreshToken: "rt" }

    it("verifies the token, rotates it, and returns new tokens", async () => {
      jwt.verify.mockReturnValue({ id: "user-1" })
      prisma.users.findUnique.mockResolvedValue(buildUser())

      const tokens = await service.refreshToken(input)

      expect(jwt.verify).toHaveBeenCalledWith("rt")
      expect(tokens).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" })
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { refreshTokenHash: "hashed" },
      })
    })

    it("throws InValidRefreshToken when verification fails (tampered or expired)", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("jwt expired")
      })

      await expect(service.refreshToken(input)).rejects.toThrow(
        AuthErrors.InValidRefreshToken.message,
      )
      expect(prisma.users.findUnique).not.toHaveBeenCalled()
    })

    it("throws UserIsNotAuthorized when the user has no stored refresh-token hash", async () => {
      jwt.verify.mockReturnValue({ id: "user-1" })
      prisma.users.findUnique.mockResolvedValue(buildUser({ refreshTokenHash: null }))

      await expect(service.refreshToken(input)).rejects.toThrow(
        AuthErrors.UserIsNotAuthorized.message,
      )
    })

    it("throws UserIsNotAuthorized when the account has been deactivated", async () => {
      jwt.verify.mockReturnValue({ id: "user-1" })
      prisma.users.findUnique.mockResolvedValue(buildUser({ active: false }))

      await expect(service.refreshToken(input)).rejects.toThrow(
        AuthErrors.UserIsNotAuthorized.message,
      )
      expect(mockedArgon.verify).not.toHaveBeenCalled()
    })

    it("throws InValidRefreshToken when the token does not match the stored hash", async () => {
      jwt.verify.mockReturnValue({ id: "user-1" })
      prisma.users.findUnique.mockResolvedValue(buildUser())
      mockedArgon.verify.mockResolvedValue(false as never)

      await expect(service.refreshToken(input)).rejects.toThrow(
        AuthErrors.InValidRefreshToken.message,
      )
    })
  })

  describe("generatedHashedPassword", () => {
    it("hashes with the configured argon2id cost parameters", async () => {
      await service.generatedHashedPassword("secret")

      expect(mockedArgon.hash).toHaveBeenCalledWith("secret", {
        type: argon2.argon2id,
        memoryCost: 1,
        timeCost: 1,
        parallelism: 1,
      })
    })
  })
})
