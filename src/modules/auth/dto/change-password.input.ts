import { Field, InputType } from "@nestjs/graphql"
import { IsString, MaxLength, MinLength } from "class-validator"

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string
}
