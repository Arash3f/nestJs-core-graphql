import { ID, ObjectType, registerEnumType } from "@nestjs/graphql"
import { Field } from "@nestjs/graphql/dist/decorators"
import { Role } from "@prisma/client"
import { IsBoolean, IsDate, IsEnum, IsString, IsUUID } from "class-validator"

registerEnumType(Role, {
    name: "Role",
})

/**
 * * User Model Class
 */
@ObjectType({ isAbstract: true })
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

    @IsEnum(Role)
    @Field(() => Role)
    role: Role

    @Field(() => Date)
    @IsDate()
    createdDate: Date

    @Field(() => Date)
    @IsDate()
    updatedDate: Date
}
