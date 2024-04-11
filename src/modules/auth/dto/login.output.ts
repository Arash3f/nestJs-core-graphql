import { Field, ObjectType } from "@nestjs/graphql"
import { IsJWT } from "class-validator"

/**
 * * Data transfer object for Login Output
 */
@ObjectType({ isAbstract: true })
export class LoginOutput {
    @Field(() => String)
    @IsJWT()
    jwt: string
}
