import { Injectable } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { Prisma, Role, Users } from "@prisma/client"
import { AppException } from "@src/app.exception"
import type { SuccessOutput } from "@src/common/dto/success.output"
import { JwtPayload, Tokens } from "@src/common/types/request.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import type { ChangeMyPasswordInput } from "@src/modules/auth/dto/change-my-password.input"
import type { ChangePasswordInput } from "@src/modules/auth/dto/change-password.input"
import type { LoginInput } from "@src/modules/auth/dto/login.input"
import type { LoginOutput } from "@src/modules/auth/dto/login.output"
import { RefreshTokenInput } from "@src/modules/auth/dto/refresh-token.input"
import type { RegisterInput } from "@src/modules/auth/dto/register.input"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { UserErrors } from "@src/modules/user/constants/errors"
import * as argon2 from "argon2"

/**
 * Auth service
 */
@Injectable()
export class AuthService {
  /**
   * import services
   * @param prisma prisma service for call database
   * @param jwt jwt service for generate toekn
   */
  constructor(
    private prisma: PrismaService,
    private envConfig: EnvConfigService,
    private jwt: JwtService,
  ) {}

  /**
   * Takes the user's information and after validate the information returns the user's jwt Token
   *
   * @param data - Necessary data for login user
   * @param deviceId - Fingerprint of the calling device; the issued tokens are bound to it.
   *
   * @returns User's jwt Token
   *
   * @throws {AppException} AuthErrors.IncorrectUsernameOrPassword
   */
  async logIn(data: LoginInput, deviceId: string): Promise<LoginOutput> {
    const { password, username } = data

    const user = await this.verifyUserExistanceByUsername(username)
    if (!user.active) throw new AppException(AuthErrors.InactiveUser)
    await this.verifyUserPassword(user.passwordHash, password)
    const tokens = await this.generateToken(user.username, user.id, deviceId)
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    return tokens
  }

  async logout(userId: string): Promise<SuccessOutput> {
    await this.removeRefreshToken(userId)
    return { success: true }
  }

  /**
   * Public self-registration: create a new account and immediately log it in.
   *
   * The role is forced to `Member` here — it is never taken from the request —
   * so a visitor can't sign themselves up as an Admin. Implemented directly
   * against Prisma (rather than delegating to `UserService.createUser`) to keep
   * `AuthService` free of a circular dependency on `UserService`.
   *
   * @param data - Name, username and password for the new account.
   * @param deviceId - Fingerprint of the calling device; the issued tokens are bound to it.
   *
   * @returns The new user's jwt tokens (already logged in).
   *
   * @throws {AppException} UserErrors.UsernameIsDuplicated
   */
  async register(data: RegisterInput, deviceId: string): Promise<LoginOutput> {
    const { name, username, password } = data
    const hashedPassword = await this.generatedHashedPassword(password)

    try {
      await this.prisma.users.create({
        data: {
          name,
          username: username.toLowerCase(),
          passwordHash: hashedPassword,
          role: Role.Member,
        },
      })
    } catch (error: unknown) {
      this.prisma.handlePrismaErrors({
        error: error,
        duplicatedErrors: [
          {
            error: UserErrors.UsernameIsDuplicated,
            field: Prisma.UsersScalarFieldEnum.username,
          },
        ],
      })
    }

    return await this.logIn({ username, password }, deviceId)
  }

  /**
   * Take the target user's id and update their password
   *
   * @param userId - Target user's id
   * @param data - Necessary data for update user's password
   *
   * @returns True value or throw Error
   *
   * @throws {AppException} UserErrors.UserNotFound
   */
  async changePassword(userId: string, data: ChangePasswordInput): Promise<SuccessOutput> {
    const hashedPassword = await this.generatedHashedPassword(data.newPassword)

    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword, reFreshTokenHash: null },
      })

      return { success: true }
    } catch (error: unknown) {
      this.prisma.handlePrismaErrors({
        error: error,
        notFoundError: UserErrors.UserNotFound,
      })
    }
  }

  /**
   * Self-service password change for the logged-in user.
   *
   * Unlike the admin `changePassword`, this verifies the requester's current
   * password before applying the new one, so a stolen access token alone is not
   * enough to lock the owner out.
   *
   * @param userId - The requester's id (from their token).
   * @param data - Current password (for verification) and the new password.
   *
   * @returns `{ success: true }` when the password is updated.
   *
   * @throws {AppException} UserErrors.UserNotFound
   * @throws {AppException} AuthErrors.IncorrectCurrentPassword
   */
  async changeMyPassword(userId: string, data: ChangeMyPasswordInput): Promise<SuccessOutput> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } })
    if (!user) throw new AppException(UserErrors.UserNotFound)

    const valid = await argon2.verify(user.passwordHash, data.currentPassword)
    if (!valid) throw new AppException(AuthErrors.IncorrectCurrentPassword)

    const hashedPassword = await this.generatedHashedPassword(data.newPassword)
    await this.prisma.users.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword, reFreshTokenHash: null },
    })

    return { success: true }
  }

  /**
   * refresh user token with refreshToken and get new tokens
   *
   * @param userId - requested user
   * @param input - Necessary data for update user's token
   * @param deviceId - Fingerprint of the calling device; must match the device the session was bound to.
   *
   * @returns New user tokens
   *
   * @throws {AppException} AuthErrors.UserIsNotAuthorized
   * @throws {AppException} AuthErrors.DeviceMismatch - When the request comes from a different device than the one the session was issued to.
   * @throws {AppException} AuthErrors.InValidRefreshToken
   */
  async refreshToken(input: RefreshTokenInput, deviceId: string): Promise<LoginOutput> {
    let decodeToken: JwtPayload
    try {
      decodeToken = await this.jwt.verifyAsync<JwtPayload>(input.refreshToken)
    } catch {
      throw new AppException(AuthErrors.InValidRefreshToken)
    }

    if (decodeToken.deviceId !== deviceId) {
      throw new AppException(AuthErrors.DeviceMismatch)
    }

    const user = await this.prisma.users.findUnique({ where: { id: decodeToken.id } })
    if (!user || !user?.reFreshTokenHash) throw new AppException(AuthErrors.UserIsNotAuthorized)
    if (!user.active) throw new AppException(AuthErrors.InactiveUser)

    // Device binding: the request must come from the same device the refresh token was issued to.

    const isValid = await this.validateRefreshToken(user.reFreshTokenHash, input.refreshToken)
    if (!isValid) {
      throw new AppException(AuthErrors.InValidRefreshToken)
    }

    const tokens = await this.generateToken(user.username, user.id, deviceId)
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    return tokens
  }

  /**
   * Hash Password
   *
   * @param password The user's password to be Hashed
   *
   * @returns Hashed password
   */
  async generatedHashedPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.envConfig.memoryCost,
      timeCost: this.envConfig.timeCost,
      parallelism: this.envConfig.parallelism,
    })
  }
  /**
   * Verify User with UserPassword
   *
   * @param userPassword Target user password
   * @param password Target User password
   *
   * @returns result operation
   *
   * @throws {AppException} AuthErrors.IncorrectUsernameOrPassword
   */
  private async verifyUserPassword(userPassword: string, password: string): Promise<boolean> {
    const valid = await argon2.verify(userPassword, password)
    if (!valid) throw new AppException(AuthErrors.IncorrectUsernameOrPassword)

    return valid
  }

  /**
   * Generate Token
   *
   * @param username user username
   * @param userId user id
   * @param deviceId device fingerprint the tokens are bound to
   *
   * @returns user tokens
   */
  private async generateToken(username: string, userId: string, deviceId: string): Promise<Tokens> {
    const payload: JwtPayload = {
      username: username.toLowerCase(),
      id: userId,
      deviceId,
    }

    const accessToken = await this.jwt.signAsync(payload)

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.envConfig.jwtRefreshExpire,
    })

    return { accessToken, refreshToken }
  }

  /**
   * Verify User Existance By Username
   *
   * @param username Target username for Verify
   *
   * @returns User Object or throw Error
   *
   * @throws {AppException} AuthErrors.IncorrectUsernameOrPassword
   */
  async verifyUserExistanceByUsername(username: string): Promise<Users> {
    const user = await this.prisma.users.findUnique({
      where: {
        username: username.toLowerCase(),
      },
    })

    if (!user) throw new AppException(AuthErrors.IncorrectUsernameOrPassword)

    return user
  }

  /**
   * Remove refresh token
   *
   * @param userId Target username
   *
   * @returns void
   */
  private async removeRefreshToken(userId: string): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: { reFreshTokenHash: null },
    })
  }

  /**
   * Verify Refresh token
   *
   * @param reFreshTokenHash database refresh token
   * @param refreshToken requested refresh token
   *
   * @returns result of operation
   */
  private async validateRefreshToken(
    reFreshTokenHash: string,
    refreshToken: string,
  ): Promise<boolean> {
    const valid = await argon2.verify(reFreshTokenHash, refreshToken)
    return valid
  }

  /**
   * Store refresh Token in db
   *
   * @param userId target user
   * @param refreshToken requested refresh token
   *
   * @returns result of operation
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = await this.generatedHashedPassword(refreshToken)
    await this.prisma.users.update({
      where: { id: userId },
      data: { reFreshTokenHash: hashedToken },
    })
  }
}
