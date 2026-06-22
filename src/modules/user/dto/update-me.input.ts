import { Field, InputType } from "@nestjs/graphql"
import { IsOptional, IsString } from "class-validator"

/**
 * A user updating their own profile.
 *
 * Deliberately a narrow subset of {@link UpdateUserDataInput}: only `name` and
 * `username` are editable here. `role` and `active` are omitted on purpose so a
 * regular member can't escalate their own privileges or reactivate themselves —
 * those remain admin-only via the `updateUser` mutation.
 */
@InputType()
export class UpdateMeInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  username?: string
}
