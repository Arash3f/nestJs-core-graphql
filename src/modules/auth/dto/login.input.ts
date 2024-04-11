import { Field, InputType } from "@nestjs/graphql"
import { IsString } from "class-validator"

/**
 * * Data transfer object for Login Input
 */
@InputType()
export class LoginInput {
    @Field(() => String)
    @IsString()
    username: string

    @Field(() => String)
    @IsString()
    password: string
}
