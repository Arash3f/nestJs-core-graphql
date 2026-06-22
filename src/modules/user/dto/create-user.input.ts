import { Field, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsString()
  name: string

  @Field(() => String)
  @IsString()
  username: string

  /**
   * ! No length limit
   */
  @Field(() => String)
  @IsString()
  password: string

  @Field(() => Role)
  @IsEnum(Role)
  role: Role
}
