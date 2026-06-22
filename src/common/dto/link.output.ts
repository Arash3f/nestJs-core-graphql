import { Field, ObjectType } from "@nestjs/graphql"

/**
 * Data transfer object to Link Output
 */
@ObjectType()
export class LinkOutput {
  /**
   * response url link field
   */
  @Field(() => String)
  url: string
}
