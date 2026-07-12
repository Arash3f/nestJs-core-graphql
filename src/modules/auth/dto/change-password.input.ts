import { Field, InputType } from "@nestjs/graphql"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@src/common/constants/password"
import { IsString, MaxLength, MinLength } from "class-validator"

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword: string
}
