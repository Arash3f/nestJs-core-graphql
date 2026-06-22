import { Field, InputType } from "@nestjs/graphql"
import { IsJWT } from "class-validator"

@InputType()
export class RefreshTokenInput {
  @Field(() => String)
  @IsJWT()
  refreshToken: string
}
