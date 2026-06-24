import { Field, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator"

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
  @MinLength(8)
  @MaxLength(128)
  password: string

  @Field(() => Role)
  @IsEnum(Role)
  role: Role
}
