import { Field, ObjectType } from "@nestjs/graphql"

/**
 * * Data transfer object to Success Output
 */
@ObjectType({ isAbstract: true })
export class SuccessOtput {
    @Field(() => Boolean)
    success: boolean
}
