import { Field, InputType } from "@nestjs/graphql"
import { PASSWORD_MIN_LENGTH } from "@src/common/constants/password"
import { IsString, MinLength } from "class-validator"

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword: string
}
