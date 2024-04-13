import { UseGuards } from "@nestjs/common"
import { Mutation, Query, Resolver } from "@nestjs/graphql"
import { DataArg } from "@src/common/args/data.args"
import { PaginationArg } from "@src/common/args/pagination.args"
import { SortByArg } from "@src/common/args/sort-by.args"
import {
    WhereOptionalArg,
    WhereRequirementArg,
} from "@src/common/args/where.args"
import { GetUserId } from "@src/common/decorators/get-user-id.decorator"
import { IsAdmin } from "@src/common/guards/is-admin.guard"
import { IsLoggedIn } from "@src/common/guards/is-logged-in.guard"
import { IdInput } from "@src/common/input/id.input"
import { PaginationData } from "@src/common/input/pagination.input"
import { SortByData } from "@src/common/input/sort-by.input"
import { SuccessOtput } from "@src/common/output/success.output"
import { AuthService } from "@src/modules/auth/auth.service"
import { ChangePasswordInput } from "@src/modules/auth/dto/change-password.input"
import { CreateUserInput } from "@src/modules/auth/dto/create-user.input"
import { LoginInput } from "@src/modules/auth/dto/login.input"
import { LoginOutput } from "@src/modules/auth/dto/login.output"
import { ReadUserInput } from "@src/modules/auth/dto/read-user.input"
import { ReadUserOutput } from "@src/modules/auth/dto/read-user.output"
import { UpdateUserInput } from "@src/modules/auth/dto/update-user.input"
import { UserModel } from "@src/modules/auth/model/user.model"

@Resolver()
export class AuthResolver {
    constructor(private authService: AuthService) {}

    /**
     * * The logIn operation takes the user's information and validate it
     * @param data Necessary data for login user
     * @returns User's jwt Token or throw Error
     * @throws
     * {@link IncorrectUsernameOrPassword},
     */
    @Mutation(() => LoginOutput)
    async logIn(@DataArg(LoginInput) data: LoginInput): Promise<LoginOutput> {
        return await this.authService.logIn({ data })
    }

    /**
     * * The me operation return the requester informations by requester Token
     * @returns User informations or throw Error
     * @guard
     * {@link IsLoggedIn}
     */
    @Query(() => UserModel)
    @UseGuards(IsLoggedIn)
    async me(@GetUserId() requesterId: string): Promise<UserModel> {
        return await this.authService.me(requesterId)
    }

    /**
     * * The createUser operation takes the new user's information and after validate the information, generate new user and return user
     * @param data Necessary data for create user
     * @returns New User informations or throw Error
     * @guard
     * {@link IsAdmin}
     * @throws
     * {@link UsernameIsDuplicated},
     */
    @Mutation(() => UserModel)
    @UseGuards(IsAdmin)
    async createUser(
        @DataArg(CreateUserInput) data: CreateUserInput,
    ): Promise<UserModel> {
        return await this.authService.createUser({ data })
    }

    /**
     * * The readUsers operation takes the information for search and sends the found items
     * @param where Information for search
     * @param pagination Information for pagination output
     * @param sortBy Information for sort output
     * @returns Users found
     * @guard
     * {@link IsLoggedIn}
     */
    @Query(() => ReadUserOutput)
    @UseGuards(IsLoggedIn)
    async readUsers(
        @WhereOptionalArg(ReadUserInput) where: ReadUserInput,
        @PaginationArg() pagination: PaginationData,
        @SortByArg() sortBy: SortByData,
    ): Promise<ReadUserOutput> {
        return await this.authService.readUsers({ where, pagination, sortBy })
    }

    /**
     * * The updateUser operation takes the necessary information for update user and sends the updated user
     * ! The user's password will not be updated in this Api
     * @param data Necessary data for update user
     * @param where Information for find the user
     * @returns Updated user or throw Error
     * @guard
     * {@link IsAdmin}
     * @throws
     * {@link UserNotFound},
     * {@link UsernameIsDuplicated},
     */
    @Mutation(() => UserModel)
    @UseGuards(IsAdmin)
    async updateUser(
        @DataArg(UpdateUserInput) data: UpdateUserInput,
        @WhereRequirementArg(IdInput) where: IdInput,
    ): Promise<UserModel> {
        return await this.authService.updateUser({ data, where })
    }

    /**
     * * The deleteUser operation take the information for find user and delete it
     * @param where Information for find the user
     * @returns True value or throw Error
     * @guard
     * {@link IsAdmin}
     * @throws
     * {@link UserNotFound},
     */
    @Mutation(() => SuccessOtput)
    @UseGuards(IsAdmin)
    async deleteUser(
        @WhereRequirementArg(IdInput) where: IdInput,
    ): Promise<SuccessOtput> {
        return await this.authService.deleteUser(where)
    }

    /**
     * * The changePassword operation take the information for find user and update password
     * @param data Necessary data for update user's password
     * @param where Information for find the user
     * @returns True value or throw Error
     * @guard
     * {@link IsAdmin}
     * @throws
     * {@link UserNotFound},
     */
    @Mutation(() => SuccessOtput)
    @UseGuards(IsAdmin)
    async changePassword(
        @DataArg(ChangePasswordInput) data: ChangePasswordInput,
        @WhereRequirementArg(IdInput) where: IdInput,
    ): Promise<SuccessOtput> {
        return await this.authService.changePassword({ data, where })
    }
}
