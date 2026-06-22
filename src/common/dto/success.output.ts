import { Field, ObjectType } from "@nestjs/graphql"

/**
 * Data transfer object to Success Output
 */
@ObjectType()
export class SuccessOutput {
  @Field(() => Boolean)
  success: boolean
}
