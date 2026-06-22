import { Field, InputType } from "@nestjs/graphql"
import { IsUUID } from "class-validator"

/**
 * Data transfer object to Id Input
 */
@InputType()
export class IdInput {
  @Field(() => String)
  @IsUUID()
  id: string
}
