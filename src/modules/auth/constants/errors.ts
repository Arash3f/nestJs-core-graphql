import { HttpStatus } from "@nestjs/common"
import { ModuleNames } from "@src/constants"

/**
 * * Definition of auth module errors | All module's errors Collected in {@link "app.module".AppModule.generateProjectErrors | GenerateProjectErrors}
 */
export const AuthErrors = {
    UserIsNotAuthorized: {
        code: 1,
        module: ModuleNames.AuthModule,
        message: "User is not authorized",
        persianTranslation: "ابتدا وارد شوید",
        statusCode: HttpStatus.BAD_REQUEST,
    },
    AccessDenied: {
        code: 2,
        module: ModuleNames.AuthModule,
        message: "Access denied",
        persianTranslation: "دسترسی داده نشد",
        statusCode: HttpStatus.BAD_REQUEST,
    },
    UsernameIsDuplicated: {
        code: 3,
        module: ModuleNames.AuthModule,
        message: "Username is duplicate",
        persianTranslation: "نام کاربری تکراری است",
        statusCode: HttpStatus.BAD_REQUEST,
    },
    UserNotFound: {
        code: 4,
        module: ModuleNames.AuthModule,
        message: "User not found",
        persianTranslation: "کاربر پیدا نشد",
        statusCode: HttpStatus.BAD_REQUEST,
    },
    InactiveUser: {
        code: 5,
        module: ModuleNames.AuthModule,
        message: "User is inactive",
        persianTranslation: "کاربر غیر فعال است",
        statusCode: HttpStatus.BAD_REQUEST,
    },
    IncorrectUsernameOrPassword: {
        code: 6,
        module: ModuleNames.AuthModule,
        message: "The username or password is incorrect",
        persianTranslation: "نام کاربری یا پسورد اشتباه است",
        statusCode: HttpStatus.BAD_REQUEST,
    },
}
