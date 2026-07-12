import { Field, InputType } from "@nestjs/graphql"
import { PASSWORD_MIN_LENGTH } from "@src/common/constants/password"
import { IsString, MinLength } from "class-validator"

/**
 * Public self-registration input.
 *
 * Intentionally has no `role` field: registration always creates a `Member`
 * (the role is forced server-side), so a visitor can't sign themselves up as
 * an Admin. Creating users with an explicit role stays an admin-only operation
 * via the `createUser` mutation.
 */
@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsString()
  name: string

  @Field(() => String)
  @IsString()
  username: string

  @Field(() => String)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password: string
}
