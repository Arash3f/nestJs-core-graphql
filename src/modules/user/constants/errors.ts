import { HttpStatus } from "@nestjs/common"
import { ModuleNames } from "@src/constants"

export const UserErrors = {
  UsernameIsDuplicated: {
    code: 1,
    statusCode: HttpStatus.BAD_REQUEST,
    module: ModuleNames.UserModule,
    message: "Username is duplicate",
    persianTranslation: "نام کاربری تکراری است",
  },
  UserNotFound: {
    code: 2,
    statusCode: HttpStatus.BAD_REQUEST,
    module: ModuleNames.UserModule,
    message: "User not found",
    persianTranslation: "کاربر پیدا نشد",
  },
}
