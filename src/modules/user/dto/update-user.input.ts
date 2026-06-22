import { Field, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator"

@InputType()
export class UpdateUserDataInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  username?: string

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @Field(() => Role, { nullable: true })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string
}
