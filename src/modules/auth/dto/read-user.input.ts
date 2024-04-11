import { Field, ID, InputType } from "@nestjs/graphql"
import { Role } from "@prisma/client"
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator"

/**
 * * Data transfer object for Read User Input
 */
@InputType()
export class ReadUserInput {
    @Field(() => ID, { nullable: true })
    @IsOptional()
    @IsUUID()
    id?: string

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    username?: string

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    name?: string

    @IsEnum(Role)
    @IsOptional()
    @Field(() => Role, { nullable: true })
    role?: Role

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    active?: boolean
}
