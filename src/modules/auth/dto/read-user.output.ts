import { Field, Int, ObjectType } from "@nestjs/graphql"
import { UserModel } from "@src/modules/auth/model/user.model"
import { IsNumber } from "class-validator"

/**
 * * Data transfer object for Read User Output
 */
@ObjectType({ isAbstract: true })
export class ReadUserOutput {
    @Field(() => Int)
    @IsNumber()
    count: number

    @Field(() => [UserModel])
    data: UserModel[]
}
