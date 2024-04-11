import { Field, ID, InputType } from "@nestjs/graphql"
import { IsUUID } from "class-validator"

/**
 * * Data transfers object to Id Input
 */
@InputType()
export class IdInput {
    @Field(() => ID)
    @IsUUID()
    id: string
}
