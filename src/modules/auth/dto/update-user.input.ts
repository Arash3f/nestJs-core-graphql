import { Field, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

/**
 * * Data transfer object for Update User Input
 */
@InputType()
export class UpdateUserInput {
    @Field(() => String)
    @IsString()
    username: string

    @Field(() => Boolean)
    active: boolean

    @IsEnum(Role)
    @Field(() => Role, { nullable: true })
    role?: Role

    @Field(() => String)
    @IsString()
    name: string
}
