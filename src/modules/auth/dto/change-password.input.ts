import { Field, InputType } from "@nestjs/graphql"
import { IsString } from "class-validator"

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  newPassword: string
}
