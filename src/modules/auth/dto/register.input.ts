import { Field, InputType } from "@nestjs/graphql"
import { IsString, MaxLength, MinLength } from "class-validator"

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
  @MinLength(8)
  @MaxLength(128)
  password: string
}
