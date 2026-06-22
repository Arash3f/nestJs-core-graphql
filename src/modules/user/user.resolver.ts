import { UseGuards } from "@nestjs/common"
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql"
import { GetUserId } from "@src/common/decorators/get-user-id.decorator"
import { IdInput } from "@src/common/dto/id.input"
import { PaginationData } from "@src/common/dto/pagination.input"
import { SortByData } from "@src/common/dto/sort-by.input"
import { SuccessOutput } from "@src/common/dto/success.output"
import { IsAdminGuard } from "@src/common/guards/is-admin.guard"
import { IsLoggedInGuard } from "@src/common/guards/is-logged-in.guard"
import { CreateUserInput } from "@src/modules/user/dto/create-user.input"
import { ReadUserWhereInput } from "@src/modules/user/dto/read-user.input"
import { ReadUserOutput } from "@src/modules/user/dto/read-user.output"
import { UpdateMeInput } from "@src/modules/user/dto/update-me.input"
import { UpdateUserDataInput } from "@src/modules/user/dto/update-user.input"
import { UserModel } from "@src/modules/user/model/user.model"
import { UserService } from "@src/modules/user/user.service"

/**
 * User Resolver
 */
@Resolver()
export class UserResolver {
  constructor(private userService: UserService) {}

  /**
   * Return the requester informations by requester Token
   *
   * @throws {@link UserErrors.UserNotFound}
   */
  @Query(() => UserModel)
  @UseGuards(IsLoggedInGuard)
  async me(@GetUserId() requesterId: string): Promise<UserModel> {
    return await this.userService.me(requesterId)
  }

  /**
   * Lets the requester update their own profile (name / username only)
   *
   * @throws {@link UserErrors.UserNotFound}
   * @throws {@link UserErrors.UsernameIsDuplicated}
   */
  @Mutation(() => UserModel)
  @UseGuards(IsLoggedInGuard)
  async updateMe(
    @GetUserId() requesterId: string,
    @Args("data") data: UpdateMeInput,
  ): Promise<UserModel> {
    return await this.userService.updateMe(requesterId, data)
  }

  /**
   * Takes the user's information and after validate the information create new User
   *
   * @throws {@link UserErrors.UsernameIsDuplicated}
   */
  @Mutation(() => UserModel)
  @UseGuards(IsAdminGuard)
  async createUser(@Args("data") data: CreateUserInput): Promise<UserModel> {
    return await this.userService.createUser(data)
  }

  /**
   * Takes the information for search and sends the found items
   */
  @Query(() => ReadUserOutput)
  @UseGuards(IsLoggedInGuard)
  async readUsers(
    @Args("where", { nullable: true }) where: ReadUserWhereInput,
    @Args("pagination", { nullable: true }) pagination: PaginationData,
    @Args("sortBy", { nullable: true }) sortBy: SortByData,
  ): Promise<ReadUserOutput> {
    return await this.userService.readUsers({ where, pagination, sortBy })
  }

  /**
   * Takes the necessary information for update user and sends the updated user
   *
   * @throws {@link UserErrors.UserNotFound}
   * @throws {@link UserErrors.UsernameIsDuplicated}
   */
  @Mutation(() => UserModel)
  @UseGuards(IsAdminGuard)
  async updateUser(
    @Args("data") data: UpdateUserDataInput,
    @Args("where") where: IdInput,
  ): Promise<UserModel> {
    return await this.userService.updateUser({ data, where })
  }

  /**
   * Take the information for find user and delete it
   *
   * @throws {@link UserErrors.UserNotFound}
   */
  @Mutation(() => SuccessOutput)
  @UseGuards(IsAdminGuard)
  async deleteUser(@Args("where") where: IdInput): Promise<SuccessOutput> {
    return await this.userService.deleteUser(where)
  }
}
