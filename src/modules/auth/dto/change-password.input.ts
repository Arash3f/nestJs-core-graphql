import { Field, InputType } from "@nestjs/graphql"
import { IsString } from "class-validator"

/**
 * * Data transfer object for Change Password Input
 */
@InputType()
export class ChangePasswordInput {
    @Field(() => String)
    @IsString()
    newPassword: string
}
