import { Injectable } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { Prisma, Users } from "@prisma/client"
import { IdInput } from "@src/common/input/id.input"
import { SuccessOtput } from "@src/common/output/success.output"
import {
    ApiCreateType,
    ApiReadType,
    ApiUpdateType,
} from "@src/common/types/common.type"
import { JwtPayloadType } from "@src/common/types/token.type"
import { AuthErrors } from "@src/modules/auth/constants/errors"
import { ChangePasswordInput } from "@src/modules/auth/dto/change-password.input"
import { CreateUserInput } from "@src/modules/auth/dto/create-user.input"
import { LoginInput } from "@src/modules/auth/dto/login.input"
import { LoginOutput } from "@src/modules/auth/dto/login.output"
import { ReadUserInput } from "@src/modules/auth/dto/read-user.input"
import { ReadUserOutput } from "@src/modules/auth/dto/read-user.output"
import { UpdateUserInput } from "@src/modules/auth/dto/update-user.input"
import { UserModel } from "@src/modules/auth/model/user.model"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { ErrorService } from "@src/modules/error/error.service"
import { PrismaService } from "@src/modules/prisma/prisma.service"
import cleanDeep from "clean-deep"
import hasha from "hasha"

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private error: ErrorService,
        private apiConfig: EnvConfigService,
    ) {}

    /**
     * * The logIn operation takes the user's information and validate it
     * @param input Necessary data for login user
     * @returns User's jwt Token
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | IncorrectUsernameOrPassword},
     */
    async logIn(input: ApiCreateType<LoginInput>): Promise<LoginOutput> {
        const { password, username } = input.data

        const user = await this.verifyUserExistanceByUsername(username)
        await this.verifyUserPassword(user.id, password)
        const token = await this.generateToken(user.username, user.id)

        return { jwt: token }
    }

    /**
     * * Return the requester informations by requester Token
     * @param requesterId Get the userId from the Token
     * @returns User informations or throw error
     */
    async me(requesterId: string): Promise<UserModel> {
        const user: Users = await this.prisma.users.findUnique({
            where: {
                id: requesterId,
            },
        })

        return user
    }

    /**
     * * Takes the user's information and after validate the information create new User
     * @param input Necessary data for create user
     * @returns New User informations or throw error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | UsernameIsDuplicated},
     */
    async createUser(
        input: ApiCreateType<CreateUserInput>,
    ): Promise<UserModel> {
        const { password, username, name, role } = input.data
        await this.verifyDuplicateUsernameWithException(username)
        const hashedPassword = await this.generatedHashedPassword(password)

        const createUserInput: Prisma.UsersCreateInput = {
            name,
            password: hashedPassword,
            username: username.toLowerCase(),
            role,
        }

        const user = await this.prisma.users.create({
            data: createUserInput,
        })

        return user
    }

    /**
     * * Takes the information for search and sends the found items
     * @param input Information for search, pagination, sort
     * @returns Users found
     */
    async readUsers(
        input: ApiReadType<ReadUserInput>,
    ): Promise<ReadUserOutput> {
        const rawWhere = input.where || {}

        let whereClause: Prisma.UsersWhereInput = {
            id: rawWhere.id,
            active: rawWhere.active,
            username: { mode: "insensitive", contains: rawWhere.username },
            name: { mode: "insensitive", contains: rawWhere.name },
            role: rawWhere.role,
        }

        whereClause = cleanDeep(whereClause)

        const count = await this.prisma.users.count({ where: whereClause })
        const data = await this.prisma.users.findMany({
            where: whereClause,
            ...input?.sortBy?.convertToPrismaFilter(),
            ...input?.pagination?.convertToPrismaFilter(),
        })

        return { count, data }
    }

    /**
     * * Takes the necessary information for update user and sends the updated user
     * ! The user's password will not be updated in this Api
     * @param input Necessary data for update user
     * @returns Updated user Information or throw error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | UserNotFound},
     * {@link "modules/auth/constants/errors".AuthErrors | UsernameIsDuplicated},
     */
    async updateUser(
        input: ApiUpdateType<UpdateUserInput, IdInput>,
    ): Promise<UserModel> {
        const {
            data,
            where: { id },
        } = input

        const user = await this.verifyUserExistanceByUserId(id)
        await this.verifyDuplicateUsernameWithException(
            data.username,
            user.username,
        )

        /**
         * ! The user's password will not be updated
         */
        const updatedUser = await this.prisma.users.update({
            where: {
                id,
            },
            data: {
                name: data.name,
                username: data.username.toLowerCase(),
                active: data.active,
            },
        })

        return updatedUser
    }

    /**
     * * Take the information for find user and delete it
     * @param where Information for find the user
     * @returns True value or throw Error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | UserNotFound},
     */
    async deleteUser(where: IdInput): Promise<SuccessOtput> {
        const { id } = where
        await this.verifyUserExistanceByUserId(id)

        await this.prisma.users.update({
            where: { id },
            data: { active: false },
        })

        return { success: true }
    }

    /**
     * * Take the information for find user and update password
     * @param input Necessary data for update user's password
     * @returns True value or throw Error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | UserNotFound},
     */
    async changePassword(
        input: ApiUpdateType<ChangePasswordInput, IdInput>,
    ): Promise<SuccessOtput> {
        const {
            data: { newPassword },
            where: { id },
        } = input

        await this.verifyUserExistanceByUserId(id)
        const hashedPassword = await this.generatedHashedPassword(newPassword)

        await this.prisma.users.update({
            where: { id },
            data: { password: hashedPassword },
        })

        return { success: true }
    }

    /**
     * * Hash Password
     * @param password The user's password to be Hashed
     * @returns Hashed password
     */
    private async generatedHashedPassword(password: string): Promise<string> {
        return await hasha.async(password, { algorithm: "sha1" })
    }

    /**
     * * Verify User with password
     * @param userId Target userId
     * @param password Target password
     * @returns User Object or throw Error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | IncorrectUsernameOrPassword},
     */
    private async verifyUserPassword(
        userId: string,
        password: string,
    ): Promise<Users> {
        const hashedPassword = await this.generatedHashedPassword(password)

        const user = await this.prisma.users.findFirst({
            where: {
                id: userId,
                password: hashedPassword,
            },
        })

        if (!user)
            throw this.error.throwErrorToClient({
                errorData: AuthErrors.IncorrectUsernameOrPassword,
            })

        return user
    }

    /**
     * * Verify duplicate username with exception name
     * @param username Target username for Verify
     * @param exceptionName The username that should not be considered in the verification operation (Optional)
     * @returns result of operation
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | UsernameIsDuplicated},
     */
    private async verifyDuplicateUsernameWithException(
        username: string,
        exceptionName?: string,
    ): Promise<boolean> {
        const user = await this.prisma.users.findFirst({
            where: {
                username: username.toLowerCase(),
                NOT: {
                    username: exceptionName,
                },
            },
        })

        if (user)
            throw this.error.throwErrorToClient({
                errorData: AuthErrors.UsernameIsDuplicated,
            })

        return true
    }

    /**
     * * Verify User Existance By UserID
     * @param userId Target User Id for Verify Existance
     * @returns User Object or throw Error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | UserNotFound},
     */
    private async verifyUserExistanceByUserId(userId: string): Promise<Users> {
        const user = await this.prisma.users.findUnique({
            where: {
                id: userId,
            },
        })

        if (!user)
            throw this.error.throwErrorToClient({
                errorData: AuthErrors.UserNotFound,
            })

        return user
    }

    /**
     * * Verify User Existance By Username
     * @param username Target username for Verify
     * @returns User Object or throw Error
     * @throws
     * {@link "modules/auth/constants/errors".AuthErrors | IncorrectUsernameOrPassword},
     */
    private async verifyUserExistanceByUsername(
        username: string,
    ): Promise<Users> {
        const user = await this.prisma.users.findUnique({
            where: {
                username: username.toLowerCase(),
            },
        })

        if (!user)
            throw this.error.throwErrorToClient({
                errorData: AuthErrors.IncorrectUsernameOrPassword,
            })

        return user
    }

    /**
     * * Generate Token
     * @param username Target username
     * @param userId Target user id
     * @returns user's token
     */
    private async generateToken(
        username: string,
        userId: string,
    ): Promise<string> {
        const payload: JwtPayloadType = {
            username: username.toLowerCase(),
            id: userId,
        }
        return await this.jwt.signAsync(payload)
    }
}
