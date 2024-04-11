import { Field, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

/**
 * * Data transfer object for Create User Input
 */
@InputType()
export class CreateUserInput {
    @Field(() => String)
    @IsString()
    name: string

    @Field(() => String)
    @IsString()
    username: string

    /**
     * * No length limit
     */
    @Field(() => String)
    @IsString()
    password: string

    @IsEnum(Role)
    @Field(() => Role)
    role: Role
}
