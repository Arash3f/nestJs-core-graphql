import { Field, InputType } from "@nestjs/graphql"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@src/common/constants/password"
import { IsString, MaxLength, MinLength } from "class-validator"

/**
 * Self-service password change input.
 *
 * Unlike the admin-only `changePassword` (which resets any user's password by
 * id), this requires the requester to prove ownership by supplying their current
 * password before the new one is accepted.
 */
@InputType()
export class ChangeMyPasswordInput {
  @Field(() => String)
  @IsString()
  currentPassword: string

  @Field(() => String)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword: string
}
