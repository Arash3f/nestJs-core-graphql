import { Field, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { PASSWORD_MIN_LENGTH } from "@src/common/constants/password"
import { IsEnum, IsString, MinLength } from "class-validator"

@InputType()
export class CreateUserInput {
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

  @Field(() => Role)
  @IsEnum(Role)
  role: Role
}
