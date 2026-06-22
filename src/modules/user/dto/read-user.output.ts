import { Field, Int, ObjectType } from "@nestjs/graphql"
import { UserModel } from "@src/modules/user/model/user.model"
import { IsNumber } from "class-validator"

@ObjectType()
export class ReadUserOutput {
  @Field(() => Int)
  @IsNumber()
  count: number

  @Field(() => [UserModel])
  data: UserModel[]
}
