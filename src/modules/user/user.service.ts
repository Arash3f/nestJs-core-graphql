import { Injectable } from "@nestjs/common"
import { Prisma, Users } from "@prisma/client"
import { AppException } from "@src/app.exception"
import type { IdInput } from "@src/common/dto/id.input"
import type { PaginationData } from "@src/common/dto/pagination.input"
import type { SortByData } from "@src/common/dto/sort-by.input"
import type { SuccessOutput } from "@src/common/dto/success.output"
import { AuthService } from "@src/modules/auth/auth.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import { UserErrors } from "@src/modules/user/constants/errors"
import { CreateUserInput } from "@src/modules/user/dto/create-user.input"
import { ReadUserWhereInput } from "@src/modules/user/dto/read-user.input"
import { ReadUserOutput } from "@src/modules/user/dto/read-user.output"
import { UpdateMeInput } from "@src/modules/user/dto/update-me.input"
import { UpdateUserDataInput } from "@src/modules/user/dto/update-user.input"
import { UserModel } from "@src/modules/user/model/user.model"
import cleanDeep from "clean-deep"

const userSelect = {
  id: true,
  username: true,
  active: true,
  name: true,
  role: true,
  createdDate: true,
  updatedDate: true,
  passwordHash: false,
} satisfies Prisma.UsersSelect

/**
 * User service
 */
@Injectable()
export class UserService {
  /**
   * import services
   * @param prisma prisma service for call database
   */
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  /**
   * * return the requester informations by requester Token
   * @param requesterId Get the userId from the Token
   * @returns User informations
   * @throws {AppException} UserErrors.UserNotFound - When user not found
   */
  async me(requesterId: string): Promise<UserModel> {
    const user = await this.prisma.users.findUnique({
      where: { id: requesterId },
      select: userSelect,
    })

    if (!user) {
      throw new AppException(UserErrors.UserNotFound)
    }

    return user
  }

  /**
   * * Takes the user's information and after validate the information create new User
   * @param data Necessary data for create user
   * @returns New User informations or throw error
   * @throws {AppException} UserErrors.UsernameIsDuplicated - When username is duplicated
   */
  async createUser(data: CreateUserInput): Promise<UserModel> {
    const { password, username, name, role } = data
    const hashedPassword = await this.authService.generatedHashedPassword(password)

    const createUserInput: Prisma.UsersCreateInput = {
      name,
      passwordHash: hashedPassword,
      username: username.toLowerCase(),
      role,
    }

    try {
      return await this.prisma.users.create({
        data: createUserInput,
        select: userSelect,
      })
    } catch (error: unknown) {
      this.prisma.handlePrismaErrors({
        error: error,
        duplicatedErrors: [
          {
            error: UserErrors.UsernameIsDuplicated,
            field: Prisma.UsersScalarFieldEnum.username,
          },
        ],
      })
    }
  }

  /**
   * * Takes the information for search and sends the found items
   * @param input Information for search, pagination, sort
   * @returns Users found
   */
  async readUsers(input: {
    where?: ReadUserWhereInput
    pagination?: PaginationData
    sortBy?: SortByData
  }): Promise<ReadUserOutput> {
    const rawWhere = input.where || {}

    let whereClause: Prisma.UsersWhereInput = {
      id: rawWhere.id,
      active: rawWhere.active,
      username: {
        mode: "insensitive",
        contains: rawWhere.username,
      },
      name: { mode: "insensitive", contains: rawWhere.name },
      role: rawWhere.role,
    }

    whereClause = cleanDeep(whereClause)

    const count = await this.prisma.users.count({ where: whereClause })
    const data = await this.prisma.users.findMany({
      where: whereClause,
      ...input.sortBy?.convertToPrismaFilter(),
      ...input.pagination?.convertToPrismaFilter(),
      select: userSelect,
    })

    return { count, data }
  }

  /**
   * * Takes the necessary information for update user and sends the updated user
   * @param input Necessary data for update user
   * @returns Updated user Information or throw error
   * @throws {AppException} UserErrors.UserNotFound - When user not found
   * @throws {AppException} UserErrors.UsernameIsDuplicated - When username is duplicated
   */
  async updateUser(input: { data: UpdateUserDataInput; where: IdInput }): Promise<UserModel> {
    const {
      data,
      where: { id },
    } = input

    let updateClause: Prisma.UsersUpdateInput = {
      name: data.name,
      username: data.username?.toLowerCase(),
      active: data.active,
      role: data.role,
    }

    updateClause = cleanDeep(updateClause)

    try {
      return await this.prisma.users.update({
        where: { id },
        data: updateClause,
        select: userSelect,
      })
    } catch (error: unknown) {
      this.prisma.handlePrismaErrors({
        error: error,
        duplicatedErrors: [
          {
            error: UserErrors.UsernameIsDuplicated,
            field: Prisma.UsersScalarFieldEnum.username,
          },
        ],
        notFoundError: UserErrors.UserNotFound,
      })
    }
  }

  /**
   * * Lets a logged-in user update their own profile (name / username only)
   * @param requesterId The user id taken from the requester's token
   * @param data The fields the user is allowed to change about themselves
   * @returns Updated user Information or throw error
   * @throws {AppException} UserErrors.UserNotFound - When user not found
   * @throws {AppException} UserErrors.UsernameIsDuplicated - When username is duplicated
   */
  async updateMe(requesterId: string, data: UpdateMeInput): Promise<UserModel> {
    let updateClause: Prisma.UsersUpdateInput = {
      name: data.name,
      username: data.username?.toLowerCase(),
    }

    updateClause = cleanDeep(updateClause)

    try {
      return await this.prisma.users.update({
        where: { id: requesterId },
        data: updateClause,
        select: userSelect,
      })
    } catch (error: unknown) {
      this.prisma.handlePrismaErrors({
        error: error,
        duplicatedErrors: [
          {
            error: UserErrors.UsernameIsDuplicated,
            field: Prisma.UsersScalarFieldEnum.username,
          },
        ],
        notFoundError: UserErrors.UserNotFound,
      })
    }
  }

  /**
   * * Take the information for find user and delete it
   * @param where Information for find the user
   * @returns True value or throw Error
   * @throws {AppException} UserErrors.UserNotFound - When user not found
   */
  async deleteUser(where: IdInput): Promise<SuccessOutput> {
    const { id } = where

    try {
      await this.prisma.users.update({
        where: { id },
        data: { active: false },
      })

      return { success: true }
    } catch (error: unknown) {
      this.prisma.handlePrismaErrors({
        error: error,
        notFoundError: UserErrors.UserNotFound,
      })
    }
  }

  /**
   * * Verify duplicate username with exception name
   * @param username Target username for Verify
   * @param exceptionName The username that should not be considered in the verification operation (Optional)
   * @returns result of operation
   * @throws {AppException} UserErrors.UsernameIsDuplicated - When username is duplicated
   */
  async verifyDuplicateUsernameWithException(
    username: string,
    exceptionName?: string,
  ): Promise<boolean> {
    const user = await this.prisma.users.findFirst({
      where: {
        username: username.toLowerCase(),
        NOT: { username: exceptionName },
      },
    })

    if (user) throw new AppException(UserErrors.UsernameIsDuplicated)

    return true
  }

  /**
   * * Verify User Existance By UserID
   * @param userId Target User Id for Verify Existance
   * @returns User Object or throw Error
   * @throws {AppException} UserErrors.UserNotFound - When user not found
   */
  async verifyUserExistanceByUserId(userId: string): Promise<Users> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } })

    if (!user) throw new AppException(UserErrors.UserNotFound)

    return user
  }
}
