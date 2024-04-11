import { Field, ObjectType } from "@nestjs/graphql"

/**
 * * Data transfers object to Link Output
 */
@ObjectType({ isAbstract: true })
export class LinkOtput {
    @Field(() => String)
    url: string
}
