import { UseGuards } from "@nestjs/common"
import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { GetDeviceFingerprint } from "@src/common/decorators/get-device-fingerprint.decorator"
import { GetUserId } from "@src/common/decorators/get-user-id.decorator"
import { IdInput } from "@src/common/dto/id.input"
import { SuccessOutput } from "@src/common/dto/success.output"
import { GqlThrottlerGuard } from "@src/common/guards/gql-throttler.guard"
import { IsAdminGuard } from "@src/common/guards/is-admin.guard"
import { IsLoggedInGuard } from "@src/common/guards/is-logged-in.guard"
import { AuthService } from "@src/modules/auth/auth.service"
import { ChangeMyPasswordInput } from "@src/modules/auth/dto/change-my-password.input"
import { ChangePasswordInput } from "@src/modules/auth/dto/change-password.input"
import { LoginInput } from "@src/modules/auth/dto/login.input"
import { LoginOutput } from "@src/modules/auth/dto/login.output"
import { RefreshTokenInput } from "@src/modules/auth/dto/refresh-token.input"
import { RegisterInput } from "@src/modules/auth/dto/register.input"

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  /**
   * Login a user with username/password, bound to the calling device.
   *
   * @throws {@link AuthErrors.IncorrectUsernameOrPassword}
   */
  @Mutation(() => LoginOutput)
  @UseGuards(GqlThrottlerGuard)
  async logIn(
    @Args("data") data: LoginInput,
    @GetDeviceFingerprint() deviceId: string,
  ): Promise<LoginOutput> {
    return await this.authService.logIn(data, deviceId)
  }

  /**
   * Public self-registration. Always creates a Member and returns tokens (auto-login).
   *
   * @throws {@link UserErrors.UsernameIsDuplicated}
   */
  @Mutation(() => LoginOutput)
  @UseGuards(GqlThrottlerGuard)
  async register(
    @Args("data") data: RegisterInput,
    @GetDeviceFingerprint() deviceId: string,
  ): Promise<LoginOutput> {
    return await this.authService.register(data, deviceId)
  }

  /**
   * Logs out the requester by clearing their stored refresh token.
   */
  @Mutation(() => SuccessOutput)
  @UseGuards(IsLoggedInGuard)
  async logout(@GetUserId() requesterId: string): Promise<SuccessOutput> {
    return await this.authService.logout(requesterId)
  }

  /**
   * Admin-only: reset any user's password by id (no current-password check).
   *
   * @throws {@link UserErrors.UserNotFound}
   */
  @Mutation(() => SuccessOutput)
  @UseGuards(IsAdminGuard)
  async changePassword(
    @Args("data") data: ChangePasswordInput,
    @Args("where") where: IdInput,
  ): Promise<SuccessOutput> {
    return await this.authService.changePassword(where, data)
  }

  /**
   * Self-service: lets the logged-in user change their own password after
   * verifying their current one.
   *
   * @throws {@link UserErrors.UserNotFound}
   * @throws {@link AuthErrors.IncorrectCurrentPassword}
   */
  @Mutation(() => SuccessOutput)
  @UseGuards(IsLoggedInGuard)
  async changeMyPassword(
    @GetUserId() requesterId: string,
    @Args("data") data: ChangeMyPasswordInput,
  ): Promise<SuccessOutput> {
    return await this.authService.changeMyPassword(requesterId, data)
  }

  /**
   * Refresh user tokens with a refresh token, bound to the calling device.
   *
   * @throws {@link AuthErrors.UserIsNotAuthorized}
   * @throws {@link AuthErrors.DeviceMismatch}
   * @throws {@link AuthErrors.InValidRefreshToken}
   */
  @Mutation(() => LoginOutput)
  @UseGuards(GqlThrottlerGuard)
  async refreshToken(
    @Args("data") data: RefreshTokenInput,
    @GetDeviceFingerprint() deviceId: string,
  ): Promise<LoginOutput> {
    return await this.authService.refreshToken(data, deviceId)
  }
}
