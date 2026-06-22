import { Field, ID, ObjectType, registerEnumType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { IsBoolean, IsDate, IsEnum, IsString, IsUUID } from "class-validator"

registerEnumType(Role, {
  name: "Role",
})

@ObjectType()
export class UserModel {
  @Field(() => ID)
  @IsUUID()
  id: string

  @Field(() => String)
  @IsString()
  name: string

  @Field(() => String)
  @IsString()
  username: string

  @Field(() => Boolean)
  @IsBoolean()
  active: boolean

  @Field(() => Role)
  @IsEnum(Role)
  role: Role

  @Field(() => Date)
  @IsDate()
  createdDate: Date

  @Field(() => Date)
  @IsDate()
  updatedDate: Date
}
